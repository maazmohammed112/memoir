import React from 'react';
import { createRoot } from 'react-dom/client';
import { Agentation } from 'agentation';

const HOST_ID = 'memoir-agentation-root';

export function mountAgentation() {
  if (!import.meta.env.DEV || window.matchMedia('(pointer: coarse)').matches) return;
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.dataset.developmentTool = 'agentation';
  document.body.appendChild(host);
  createRoot(host).render(React.createElement(Agentation, { copyToClipboard: true }));
}
