import { describe, expect, it } from 'vitest';
import { buildIndex, breadcrumbFor, isConceptId, resolve, systemsOf } from '../../src/atlas/selection';
import type { Bp3dManifest } from '../../src/atlas/manifest';
import fixture from '../fixtures/selection.json';

// Real concepts and their real element meshes, lifted from the shipped
// manifest, so these assertions exercise the rules against the actual data.
const manifest = fixture as unknown as Bp3dManifest;
const index = buildIndex(manifest);
const idOf = (name: string) => manifest.concepts.find((c) => c.name === name)!.id;

describe('concept and element resolution', () => {
  it('tells concept ids from mesh ids', () => {
    expect(isConceptId('FMA7088')).toBe(true);
    expect(isConceptId('FJ1252')).toBe(false);
  });

  it('resolves the heart to all the meshes that compose it', () => {
    // The heart has no mesh of its own; it gathers many.
    const heart = resolve(index, idOf('heart'))!;
    expect(heart.kind).toBe('concept');
    expect(heart.elements.length).toBeGreaterThan(50);
  });

  it('files the heart under the heart, not its coronary vessels', () => {
    // More of the heart's meshes are vessels than chambers, so counting
    // meshes would file it under arteries.
    expect(resolve(index, idOf('heart'))!.system).toBe('cardiac');
  });

  it('files the liver under digestion, not its hepatic veins', () => {
    // The liver's segments are named after hepatic veins and classified
    // venous upstream, so weighing the concept by bulk files it under veins.
    // The meshes actually called "liver" are what a reader means.
    expect(resolve(index, idOf('liver'))!.system).toBe('digestive');
  });

  it('files the brain under the nervous system', () => {
    expect(resolve(index, idOf('brain'))!.system).toBe('nervous');
  });

  it('reports every system a selection touches, so all of them can load', () => {
    // A selection whose systems are not all loaded would be invisible.
    const systems = systemsOf(index, resolve(index, idOf('heart'))!);
    expect(systems).toContain('cardiac');
    expect(systems.length).toBeGreaterThan(1);
  });

  it('resolves a single mesh to itself', () => {
    const mesh = manifest.parts[0]!;
    const selection = resolve(index, mesh.id)!;
    expect(selection.kind).toBe('element');
    expect(selection.elements).toEqual([mesh.id]);
  });

  it('returns nothing for an id that does not exist', () => {
    expect(resolve(index, 'FMA99999999')).toBeNull();
    expect(resolve(index, 'nonsense')).toBeNull();
  });

  it('gives a mesh the concepts that contain it, most specific first', () => {
    const heart = resolve(index, idOf('heart'))!;
    const crumbs = breadcrumbFor(index, heart.elements[0]!);
    expect(crumbs.length).toBeGreaterThan(0);
    for (let i = 1; i < crumbs.length; i++) {
      expect(crumbs[i]!.elements.length).toBeGreaterThanOrEqual(crumbs[i - 1]!.elements.length);
    }
  });
});

describe('organs the dataset models only as their blood supply', () => {
  // BodyParts3D carries no lung parenchyma and no liver-lobe tissue, so these
  // concepts reach nothing but vessels and airways. Vessel geometry is tubing
  // — finely segmented and heavy in triangles out of all proportion to its
  // anatomical weight — so weighing a concept by triangles handed the lung to
  // the arteries that run through it.
  it('files the lung under the airways, not the arteries inside it', () => {
    expect(resolve(index, idOf('left lung'))!.system).toBe('respiratory');
    expect(resolve(index, idOf('right lung'))!.system).toBe('respiratory');
  });

  it('files a lobe of the lung the same way as the lung', () => {
    expect(resolve(index, idOf('upper lobe of left lung'))!.system).toBe('respiratory');
    expect(resolve(index, idOf('lower lobe of right lung'))!.system).toBe('respiratory');
  });

  it('files a lobe of the liver under digestion, not its hepatic veins', () => {
    expect(resolve(index, idOf('left lobe of liver'))!.system).toBe('digestive');
    expect(resolve(index, idOf('right lobe of liver'))!.system).toBe('digestive');
  });
});

describe('structures that really are vessels', () => {
  // The rule above must not sweep the vasculature into the organs it feeds.
  it('leaves a named vessel where it belongs', () => {
    expect(resolve(index, idOf('aorta'))!.system).toBe('arterial');
    expect(resolve(index, idOf('great cardiac vein'))!.system).toBe('venous');
  });

  it('leaves a vascular system vascular even with no mesh of its own', () => {
    // "portal venous system" has no mesh called that, so the tissue rule
    // would have moved it to the liver it drains. It says what it is.
    expect(resolve(index, idOf('portal venous system'))!.system).toBe('venous');
    expect(resolve(index, idOf('systemic arterial system'))!.system).toBe('arterial');
  });

  it('does not read "ventricle" as a vein', () => {
    expect(resolve(index, idOf('cavity of left ventricle'))!.system).toBe('cardiac');
  });
});
