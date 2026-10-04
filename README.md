# EASYLOG
## Desarrollo

- La app es un único `index.html`; hacer push a `main` la despliega en GitHub Pages.
- **Versión y auto-actualización:** `APP_VERSION` se sube sola en cada commit que toca `index.html` gracias a `.githooks/pre-commit`. Hay que activarla una vez en cada clon:

  ```bash
  git config core.hooksPath .githooks
  ```

  No uses `git commit -n`: se salta el hook, la versión no cambia y los móviles no se actualizarán.
- Tras cada push, comprueba que ya se sirve la versión nueva:
  `curl -s https://californiakid91.github.io/EASYLOG/ | grep "^const APP_VERSION"`
