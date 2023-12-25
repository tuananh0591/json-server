import assert from 'node:assert/strict'
import test from 'node:test'

import { Low, Memory } from 'lowdb'
import { ParsedUrlQuery } from 'querystring'

import { Data, Item, PaginatedItems, Service } from './service.js'

const defaultData = { posts: [] }
const adapter = new Memory<Data>()
const db = new Low<Data>(adapter, defaultData)
const service = new Service(db)
const POSTS = 'posts'
const COMMENTS = 'comments'
const UNKNOWN_RESOURCE = 'xxx'
const UNKNOWN_ID = 'xxx'
const post1 = { id: '1', title: 'a', views: 100, author: { name: 'foo' } }
const post2 = { id: '2', title: 'b', views: 200, author: { name: 'bar' } }
const post3 = { id: '3', title: 'c', views: 300, author: { name: 'baz' } }
const comment1 = { id: '1', title: 'a', postId: '1' }
const items = 3
function reset() {
  const post1 = { id: '1', title: 'a', views: 100, author: { name: 'foo' } }
  const post2 = { id: '2', title: 'b', views: 200, author: { name: 'bar' } }
  const post3 = { id: '3', title: 'c', views: 300, author: { name: 'baz' } }
  const comment1 = { id: '1', title: 'a', postId: '1' }
  db.data = { posts: [post1, post2, post3], comments: [comment1] }
}

type Test = {
  data?: Data
  name: string
  params?: ParsedUrlQuery
  res: Item | Item[] | PaginatedItems | undefined
  error?: Error
}

await test('findById', () => {
  reset()
  assert.deepEqual(service.findById(POSTS, '1', {}), db.data?.[POSTS]?.[0])
  assert.equal(service.findById(POSTS, UNKNOWN_ID, {}), undefined)
  assert.deepEqual(service.findById(POSTS, '1', { _include: ['comments'] }), {
    ...post1,
    comments: [comment1],
  })
  assert.deepEqual(service.findById(COMMENTS, '1', { _include: ['post'] }), {
    ...comment1,
    post: post1,
  })
  assert.equal(service.findById(UNKNOWN_RESOURCE, '1', {}), undefined)
})

await test('find', () => {
  const arr: Test[] = [
    {
      name: POSTS,
      res: [post1, post2, post3],
    },
    {
      name: POSTS,
      params: { id: post1.id },
      res: [post1],
    },
    {
      name: POSTS,
      params: { id: UNKNOWN_ID },
      res: [],
    },
    {
      name: POSTS,
      params: { views: post1.views.toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { 'author.name': post1.author.name },
      res: [post1],
    },
    {
      name: POSTS,
      params: { id: UNKNOWN_ID, views: post1.views.toString() },
      res: [],
    },
    {
      name: POSTS,
      params: { views_ne: post1.views.toString() },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { views_lt: (post1.views + 1).toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { views_lt: post1.views.toString() },
      res: [],
    },
    {
      name: POSTS,
      params: { views_lte: post1.views.toString() },
      res: [post1],
    },
    {
      name: POSTS,
      params: { views_gt: post1.views.toString() },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { views_gt: (post1.views - 1).toString() },
      res: [post1, post2, post3],
    },
    {
      name: POSTS,
      params: { views_gte: post1.views.toString() },
      res: [post1, post2, post3],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: 'views' },
      res: [post1, post2, post3],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: '-views' },
      res: [post3, post2, post1],
    },
    {
      data: { posts: [post3, post1, post2] },
      name: POSTS,
      params: { _sort: '-views,id' },
      res: [post3, post2, post1],
    },
    {
      name: POSTS,
      params: { _start: '0', _end: '2' },
      res: [post1, post2],
    },
    {
      name: POSTS,
      params: { _start: '1', _end: '3' },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { _start: '0', _limit: '2' },
      res: [post1, post2],
    },
    {
      name: POSTS,
      params: { _start: '1', _limit: '2' },
      res: [post2, post3],
    },
    {
      name: POSTS,
      params: { _page: '1', _per_page: '2' },
      res: {
        first: 1,
        last: 2,
        prev: null,
        next: 2,
        pages: 2,
        items,
        data: [post1, post2],
      },
    },
    {
      name: POSTS,
      params: { _page: '2', _per_page: '2' },
      res: {
        first: 1,
        last: 2,
        prev: 1,
        next: null,
        pages: 2,
        items,
        data: [post3],
      },
    },
    {
      name: POSTS,
      params: { _page: '3', _per_page: '2' },
      res: {
        first: 1,
        last: 2,
        prev: 1,
        next: null,
        pages: 2,
        items,
        data: [post3],
      },
    },
    {
      name: POSTS,
      params: { _include: ['comments'] },
      res: [
        { ...post1, comments: [comment1] },
        { ...post2, comments: [] },
        { ...post3, comments: [] },
      ],
    },
    {
      name: COMMENTS,
      params: { _include: ['post'] },
      res: [{ ...comment1, post: post1 }],
    },
    {
      name: UNKNOWN_RESOURCE,
      res: undefined,
    },
  ]
  for (const tc of arr) {
    if (tc.data) {
      db.data = tc.data
    } else {
      reset()
    }

    assert.deepEqual(service.find(tc.name, tc.params), tc.res)
  }
})

await test('create', async () => {
  reset()
  const post = { title: 'new post' }
  const res = await service.create(POSTS, post)
  assert.equal(res?.['title'], post.title)
  assert.equal(typeof res?.['id'], 'string', 'id should be a string')

  assert.equal(await service.create(UNKNOWN_RESOURCE, post), undefined)
})

await test('update', async () => {
  reset()
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.update(POSTS, post1.id, post)
  assert.equal(res?.['id'], post1.id, 'id should not change')
  assert.equal(res?.['title'], post.title)

  assert.equal(
    await service.update(UNKNOWN_RESOURCE, post1.id, post),
    undefined,
  )
  assert.equal(await service.update(POSTS, UNKNOWN_ID, post), undefined)
})

await test('patch', async () => {
  reset()
  const post = { id: 'xxx', title: 'updated post' }
  const res = await service.patch(POSTS, post1.id, post)
  assert.notEqual(res, undefined)
  assert.equal(res?.['id'], post1.id)
  assert.equal(res?.['title'], post.title)

  assert.equal(await service.patch(UNKNOWN_RESOURCE, post1.id, post), undefined)
  assert.equal(await service.patch(POSTS, UNKNOWN_ID, post), undefined)
})

await test('destroy', async () => {
  reset()
  let prevLength = db.data?.[POSTS]?.length || 0
  await service.destroy(POSTS, post1.id)
  assert.equal(db.data?.[POSTS]?.length, prevLength - 1)
  assert.deepEqual(db.data?.[COMMENTS], [{ ...comment1, postId: null }])

  reset()
  prevLength = db.data?.[POSTS]?.length || 0
  await service.destroy(POSTS, post1.id, [COMMENTS])
  assert.equal(db.data[POSTS].length, prevLength - 1)
  assert.equal(db.data[COMMENTS].length, 0)

  assert.equal(await service.destroy(UNKNOWN_RESOURCE, post1.id), undefined)
  assert.equal(await service.destroy(POSTS, UNKNOWN_ID), undefined)
})