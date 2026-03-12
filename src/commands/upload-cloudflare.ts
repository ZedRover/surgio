// istanbul ignore file
import path from 'path'
import { Flags } from '@oclif/core'
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3'
import fs from 'fs-extra'
import dir from 'node-dir'

import BaseCommand from '../base-command'
import { setConfig } from '../config'

class UploadCloudflareCommand extends BaseCommand<
  typeof UploadCloudflareCommand
> {
  static description = '上传规则到 Cloudflare R2'

  public async run(): Promise<void> {
    const config = this.surgioConfig

    if (this.flags.output) {
      setConfig('output', this.flags.output)
    }

    const bucket = config?.uploadCloudflare?.bucket
    const accountId =
      process.env.CF_ACCOUNT_ID ?? config?.uploadCloudflare?.accountId
    const accessKeyId =
      process.env.CF_ACCESS_KEY_ID ?? config?.uploadCloudflare?.accessKeyId
    const secretAccessKey =
      process.env.CF_SECRET_ACCESS_KEY ??
      config?.uploadCloudflare?.secretAccessKey

    if (!bucket) {
      throw new Error('请在配置文件中配置 uploadCloudflare.bucket')
    }

    if (!accountId) {
      throw new Error(
        '请在配置文件中配置 uploadCloudflare.accountId 或设置 CF_ACCOUNT_ID 环境变量',
      )
    }

    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        '请在配置文件中配置 uploadCloudflare 的 accessKeyId 和 secretAccessKey，或设置 CF_ACCESS_KEY_ID 和 CF_SECRET_ACCESS_KEY 环境变量',
      )
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })

    const prefix = config?.uploadCloudflare?.prefix || '/'
    const normalizedPrefix = prefix.startsWith('/') ? prefix.slice(1) : prefix

    const fileList = await dir.promiseFiles(config.output)
    const files = fileList.map((filePath: any) => ({
      fileName: path.basename(filePath),
      filePath,
    }))
    const fileNameList = files.map((file: any) => file.fileName)

    const upload = () => {
      return Promise.all(
        files.map((file: any) => {
          const { fileName, filePath } = file
          const objectKey = `${normalizedPrefix}${fileName}`
          const readStream = fs.createReadStream(filePath)

          return client.send(
            new PutObjectCommand({
              Bucket: bucket,
              Key: objectKey,
              Body: readStream,
              ContentType: 'text/plain; charset=utf-8',
              CacheControl: 'private, no-cache, no-store',
            }),
          )
        }),
      )
    }

    const deleteUnwanted = async () => {
      const listResult = await client.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: normalizedPrefix,
          Delimiter: '/',
          MaxKeys: 100,
        }),
      )

      const deleteList: { Key: string }[] = []

      if (listResult.Contents) {
        for (const object of listResult.Contents) {
          if (object.Key) {
            const objectName = object.Key.replace(normalizedPrefix, '')
            const isExist = fileNameList.indexOf(objectName) > -1

            if (objectName && !isExist) {
              deleteList.push({ Key: object.Key })
            }
          }
        }
      }

      if (deleteList.length) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
              Objects: deleteList,
            },
          }),
        )
      }
    }

    this.ora.start('开始上传到 Cloudflare R2')
    await upload()
    await deleteUnwanted()

    await this.cleanup()
  }
}

UploadCloudflareCommand.flags = {
  output: Flags.string({
    char: 'o',
    description: '生成规则的目录',
  }),
}

export default UploadCloudflareCommand
