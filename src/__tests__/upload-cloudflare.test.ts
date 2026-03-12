import test from 'ava'

import { SurgioConfigValidator } from '../validators/surgio-config'

test('uploadCloudflare config validates correctly', (t) => {
  const result = SurgioConfigValidator.safeParse({
    artifacts: [],
    uploadCloudflare: {
      bucket: 'my-bucket',
      accountId: '1234567890abcdef',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
    },
  })

  t.true(result.success)
  if (result.success) {
    t.is(result.data.uploadCloudflare?.bucket, 'my-bucket')
    t.is(result.data.uploadCloudflare?.accountId, '1234567890abcdef')
    t.is(result.data.uploadCloudflare?.accessKeyId, 'test-access-key')
    t.is(result.data.uploadCloudflare?.secretAccessKey, 'test-secret-key')
  }
})

test('uploadCloudflare config with prefix', (t) => {
  const result = SurgioConfigValidator.safeParse({
    artifacts: [],
    uploadCloudflare: {
      bucket: 'my-bucket',
      accountId: '1234567890abcdef',
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      prefix: '/configs/',
    },
  })

  t.true(result.success)
  if (result.success) {
    t.is(result.data.uploadCloudflare?.prefix, '/configs/')
  }
})

test('uploadCloudflare config is optional', (t) => {
  const result = SurgioConfigValidator.safeParse({
    artifacts: [],
  })

  t.true(result.success)
  if (result.success) {
    t.is(result.data.uploadCloudflare, undefined)
  }
})

test('uploadCloudflare config rejects missing required fields', (t) => {
  const result = SurgioConfigValidator.safeParse({
    artifacts: [],
    uploadCloudflare: {
      bucket: 'my-bucket',
      // missing accountId, accessKeyId, secretAccessKey
    },
  })

  t.false(result.success)
})

test('uploadCloudflare can coexist with upload (OSS)', (t) => {
  const result = SurgioConfigValidator.safeParse({
    artifacts: [],
    upload: {
      bucket: 'oss-bucket',
      accessKeyId: 'oss-key',
      accessKeySecret: 'oss-secret',
    },
    uploadCloudflare: {
      bucket: 'r2-bucket',
      accountId: 'cf-account-id',
      accessKeyId: 'r2-key',
      secretAccessKey: 'r2-secret',
    },
  })

  t.true(result.success)
  if (result.success) {
    t.is(result.data.upload?.bucket, 'oss-bucket')
    t.is(result.data.uploadCloudflare?.bucket, 'r2-bucket')
  }
})
