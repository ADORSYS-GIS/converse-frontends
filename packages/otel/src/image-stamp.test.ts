import { describe, expect, it } from 'vitest';

import { resolveImageStamp, tagFromImageReference } from './image-stamp';

/**
 * `image-stamp.ts` — the parsing that separates a container image's TAG from its full REFERENCE
 * (converse-frontends#480 follow-up).
 *
 * This is worth its own suite because the bug it fixes was invisible: a full reference is a
 * perfectly plausible-looking string in an Image row, and only reads as wrong once you try to use
 * it as a `service.version` in Tempo. The cases below are the ones a naive `split(':')` gets
 * wrong.
 */

describe('tagFromImageReference', () => {
  it('takes the tag off the reference the pipeline pushes', () => {
    expect(
      tagFromImageReference('ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad')
    ).toBe('sha-5fed3ad');
    expect(tagFromImageReference('ghcr.io/adorsys-gis/converse-frontends/lci:latest')).toBe(
      'latest'
    );
  });

  it('does not mistake a registry port for a tag', () => {
    // The naive `reference.split(':').pop()` answers `5000/console` here, which is not a tag and
    // would be stamped onto every span from a locally-registried deployment.
    expect(tagFromImageReference('localhost:5000/console')).toBeUndefined();
    expect(tagFromImageReference('localhost:5000/console:sha-5fed3ad')).toBe('sha-5fed3ad');
  });

  it('does not mistake a digest for a tag', () => {
    expect(
      tagFromImageReference(
        'ghcr.io/adorsys-gis/converse-frontends/console@sha256:' + 'a'.repeat(64)
      )
    ).toBeUndefined();
    // A reference can carry both; the tag is still the tag.
    expect(
      tagFromImageReference(
        'ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad@sha256:' + 'a'.repeat(64)
      )
    ).toBe('sha-5fed3ad');
  });

  it('reports nothing for an untagged reference or an empty string', () => {
    expect(tagFromImageReference('ghcr.io/adorsys-gis/converse-frontends/console')).toBeUndefined();
    expect(tagFromImageReference('console:')).toBeUndefined();
    expect(tagFromImageReference('   ')).toBeUndefined();
  });
});

describe('resolveImageStamp', () => {
  it('reads the two halves the pipeline stamps', () => {
    expect(
      resolveImageStamp({
        IMAGE_TAG: 'sha-5fed3ad',
        IMAGE_REF: 'ghcr.io/adorsys-gis/converse-frontends/lci:sha-5fed3ad',
      })
    ).toEqual({
      tag: 'sha-5fed3ad',
      reference: 'ghcr.io/adorsys-gis/converse-frontends/lci:sha-5fed3ad',
    });
  });

  it('derives the tag from the reference when only the reference is stamped', () => {
    // The reference already contains the tag, so an environment carrying one and not the other
    // gets a correct answer rather than a missing one.
    expect(
      resolveImageStamp({ IMAGE_REF: 'ghcr.io/adorsys-gis/converse-frontends/console:sha-9c2a31c' })
    ).toEqual({
      tag: 'sha-9c2a31c',
      reference: 'ghcr.io/adorsys-gis/converse-frontends/console:sha-9c2a31c',
    });
  });

  it('never propagates a full reference through IMAGE_TAG', () => {
    // This is the #477 bug, held down by a test: an environment that puts the reference in the
    // tag variable still yields a tag. It does NOT invent a reference from it — `reference` is
    // whatever `IMAGE_REF` says, and here that is nothing.
    expect(
      resolveImageStamp({
        IMAGE_TAG: 'ghcr.io/adorsys-gis/converse-frontends/console:sha-5fed3ad',
      })
    ).toEqual({ tag: 'sha-5fed3ad', reference: undefined });
  });

  it('reports nothing at all off a build pipeline', () => {
    expect(resolveImageStamp({})).toEqual({ tag: undefined, reference: undefined });
    expect(resolveImageStamp({ IMAGE_TAG: '  ', IMAGE_REF: '' })).toEqual({
      tag: undefined,
      reference: undefined,
    });
  });
});
