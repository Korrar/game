// Singleton async Rapier WASM loader
import RAPIER from "@dimforge/rapier2d-compat";

let _rapier = null;
let _promise = null;

export async function initRapier() {
  if (_rapier) return _rapier;
  if (_promise) return _promise;
  _promise = RAPIER.init().then(() => {
    _rapier = RAPIER;
    return RAPIER;
  });
  return _promise;
}

export function getRapier() {
  return _rapier;
}
