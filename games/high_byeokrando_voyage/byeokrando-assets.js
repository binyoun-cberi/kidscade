/* Byeokrando asset pass v1
   Keeps illustrated port hubs as the default view and adds an optional real-3D port layer.
   Preferred models come from assets/game/3d/byeokrando; historically neutral CC0 fallbacks
   are used only for cargo props while the dedicated pack is unavailable. */
(() => {
  'use strict';
  const T = window.THREE;
  const Loader = window.GLTFLoader;
  if (!T || !Loader) return;

  const scriptBase = (() => {
    try { return new URL('.', document.currentScript?.src || location.href); }
    catch (_) { return new URL('.', location.href); }
  })();
  const url = p => new URL(p, scriptBase).href;

  const MODELS = {
    rowSmall: {
      preferred: url('../../assets/game/3d/byeokrando/ships/boat-row-small.glb')
    },
    rowLarge: {
      preferred: url('../../assets/game/3d/byeokrando/ships/boat-row-large.glb')
    },
    crate: {
      preferred: url('../../assets/game/3d/byeokrando/port_props/Crate.glb'),
      fallback: url('../../assets/game/3d/survival/kenney-survival-kit/box.glb')
    },
    bags: {
      preferred: url('../../assets/game/3d/byeokrando/port_props/Bags.glb'),
      fallback: url('../../assets/game/food/bag.glb')
    },
    cart: {
      preferred: url('../../assets/game/3d/byeokrando/port_props/Cart.glb')
    },
    parcel: {
      preferred: url('../../assets/game/3d/byeokrando/port_props/Package.glb'),
      fallback: url('../../assets/game/3d/survival/kenney-survival-kit/box-large.glb')
    },
    smoke: {
      preferred: url('../../assets/game/3d/byeokrando/port_props/Smoke.glb')
    },
    marketStand: {
      preferred: url('../../assets/game/3d/byeokrando/optional_review/Market%20Stand.glb')
    }
  };

  const loader = new Loader();
  const cache = new Map();
  const status = { preferred: 0, fallback: 0, failed: 0, lastPort: null };
  window.byeokrandoAssetDebug = { MODELS, status, cache };

  function loadUrl(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise((resolve, reject) => {
      loader.load(src, gltf => resolve(gltf.scene), undefined, reject);
    });
    cache.set(src, p);
    return p;
  }

  async function loadModel(key) {
    const spec = MODELS[key];
    if (!spec) throw new Error('Unknown model: ' + key);
    try {
      const scene = await loadUrl(spec.preferred);
      status.preferred++;
      return scene;
    } catch (err) {
      if (!spec.fallback) {
        status.failed++;
        throw err;
      }
      const scene = await loadUrl(spec.fallback);
      status.fallback++;
      return scene;
    }
  }

  function fitToSize(obj, target) {
    obj.updateMatrixWorld(true);
    let box = new T.Box3().setFromObject(obj);
    const size = new T.Vector3();
    box.getSize(size);
    const span = Math.max(size.x, size.y, size.z, 0.001);
    obj.scale.multiplyScalar(target / span);
    obj.updateMatrixWorld(true);
    box = new T.Box3().setFromObject(obj);
    obj.position.y -= box.min.y;
    obj.traverse(n => {
      if (!n.isMesh) return;
      n.castShadow = true;
      n.receiveShadow = true;
      if (n.material) {
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        mats.forEach(m => {
          if ('roughness' in m) m.roughness = Math.max(.68, m.roughness ?? .8);
        });
      }
    });
    return obj;
  }

  async function place(group, key, x, y, z, size, ry = 0, scaleY = 1) {
    try {
      const template = await loadModel(key);
      if (!group?.parent && group !== window.portGroup) return null;
      const obj = fitToSize(template.clone(true), size);
      obj.position.x += x;
      obj.position.y += y;
      obj.position.z += z;
      obj.rotation.y = ry;
      obj.scale.y *= scaleY;
      obj.name = `byeokrando-${key}`;
      group.add(obj);
      return obj;
    } catch (_) {
      return null;
    }
  }

  function removeOldPass(group) {
    if (!group) return;
    const old = group.getObjectByName('byeokrando-asset-pass');
    if (old) group.remove(old);
  }

  async function enhancePort(which) {
    if (typeof portGroup === 'undefined' || !portGroup || typeof State === 'undefined' || State.mode !== 'port') return;
    const host = portGroup;
    removeOldPass(host);
    const layer = new T.Group();
    layer.name = 'byeokrando-asset-pass';
    host.add(layer);
    status.lastPort = which;

    const dense = PORTS?.[which]?.density || 1;
    const jobs = [];

    const cargo = [
      ['crate', -47, 0, 42, 3.0, .18], ['crate', -43, 0, 44, 2.6, -.22],
      ['bags', -38, 0, 41, 2.4, .35], ['parcel', -33, 0, 44, 2.2, -.12],
      ['crate', 29, 0, 39, 2.8, .28], ['bags', 34, 0, 42, 2.3, -.26],
      ['parcel', 40, 0, 40, 2.1, .12]
    ];
    cargo.forEach(a => jobs.push(place(layer, ...a)));

    if (dense >= .7) {
      jobs.push(place(layer, 'cart', -20, 0, 34, 5.3, -.35));
      jobs.push(place(layer, 'marketStand', 9, 0, 31, 7.2, .08));
      jobs.push(place(layer, 'marketStand', 19, 0, 34, 6.4, -.12));
    }

    jobs.push(place(layer, 'rowSmall', -54, -.18, 67, 10.0, Math.PI + .12));
    jobs.push(place(layer, 'rowLarge', 53, -.18, 71, 13.0, Math.PI - .16));

    if (dense > 1.1) {
      jobs.push(place(layer, 'crate', 48, 0, 35, 3.0, -.2));
      jobs.push(place(layer, 'bags', 44, 0, 32, 2.5, .3));
      jobs.push(place(layer, 'parcel', -52, 0, 36, 2.4, .2));
    }

    await Promise.allSettled(jobs);
  }

  let threeDView = false;
  let toggle;
  function installToggle() {
    if (document.getElementById('portViewToggle')) return document.getElementById('portViewToggle');
    toggle = document.createElement('button');
    toggle.id = 'portViewToggle';
    toggle.textContent = '3D 항구 보기';
    Object.assign(toggle.style, {
      position: 'absolute', right: '14px', bottom: '54px', zIndex: '85',
      border: '1px solid rgba(230,189,98,.8)', borderRadius: '6px',
      padding: '8px 11px', background: 'rgba(25,17,11,.9)', color: '#f2d68f',
      fontWeight: '900', fontSize: '11px', cursor: 'pointer', boxShadow: '0 5px 18px #0007'
    });
    toggle.addEventListener('click', () => {
      if (typeof State === 'undefined' || State.mode !== 'port') return;
      threeDView = !threeDView;
      applyPortView();
    });
    document.getElementById('app')?.appendChild(toggle);
    return toggle;
  }

  function applyPortView() {
    const b = installToggle();
    const inPort = typeof State !== 'undefined' && State.mode === 'port';
    b.style.display = inPort ? 'block' : 'none';
    if (!inPort) return;
    if (threeDView) {
      if (typeof hideIllustratedPort === 'function') hideIllustratedPort();
      b.textContent = '삽화 보기';
      if (typeof camera !== 'undefined' && camera) {
        camera.position.set(0, 45, 98);
        camera.lookAt(0, 4, 20);
      }
    } else {
      if (typeof showIllustratedPort === 'function') showIllustratedPort(State.place);
      b.textContent = '3D 항구 보기';
      if (typeof camera !== 'undefined' && camera) {
        camera.position.set(0, 70, 117);
        camera.lookAt(0, 6, 10);
      }
    }
  }

  if (typeof buildPort === 'function') {
    const originalBuildPort = buildPort;
    buildPort = function(which) {
      const result = originalBuildPort(which);
      threeDView = false;
      Promise.resolve().then(() => enhancePort(which));
      Promise.resolve().then(applyPortView);
      return result;
    };
  }

  if (typeof startSailing === 'function') {
    const originalStartSailing = startSailing;
    startSailing = function(...args) {
      threeDView = false;
      const b = installToggle();
      b.style.display = 'none';
      return originalStartSailing.apply(this, args);
    };
  }

  installToggle();
  if (typeof State !== 'undefined' && State.mode === 'port') {
    enhancePort(State.place);
    applyPortView();
  }
})();