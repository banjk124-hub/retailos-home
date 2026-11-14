import assert from 'node:assert/strict';
import { acquireBodyScrollLock } from '../src/shared/services/bodyScrollLock.js';

function createDocument(initialOverflow = '') {
  return { body: { style: { overflow: initialOverflow } } };
}

{
  const doc = createDocument('auto');
  const releaseFirst = acquireBodyScrollLock(doc);
  assert.equal(doc.body.style.overflow, 'hidden');

  const releaseSecond = acquireBodyScrollLock(doc);
  releaseFirst();
  assert.equal(doc.body.style.overflow, 'hidden', 'releasing one owner must not unlock another owner');

  releaseSecond();
  assert.equal(doc.body.style.overflow, 'auto', 'the original overflow must be restored after the final owner releases');
}

{
  const doc = createDocument('clip');
  const releaseFirst = acquireBodyScrollLock(doc);
  const releaseSecond = acquireBodyScrollLock(doc);
  releaseSecond();
  assert.equal(doc.body.style.overflow, 'hidden', 'locks must be releasable out of acquisition order');
  releaseFirst();
  assert.equal(doc.body.style.overflow, 'clip', 'non-default inline overflow must be preserved');
}

{
  const doc = createDocument('');
  const release = acquireBodyScrollLock(doc);
  release();
  release();
  assert.equal(doc.body.style.overflow, '', 'release must be idempotent');
}

{
  const firstDocument = createDocument('auto');
  const secondDocument = createDocument('scroll');
  const releaseFirst = acquireBodyScrollLock(firstDocument);
  const releaseSecond = acquireBodyScrollLock(secondDocument);

  releaseFirst();
  assert.equal(firstDocument.body.style.overflow, 'auto');
  assert.equal(secondDocument.body.style.overflow, 'hidden', 'documents must maintain independent lock state');
  releaseSecond();
  assert.equal(secondDocument.body.style.overflow, 'scroll');
}

console.log('PASS shared body scroll-lock reference-count regression tests');
