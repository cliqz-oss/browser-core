# Fern

Fern is a build system for navigation-extension

## File transformations

One of the main function of Fern is to process source files:

### Babel

All `*.es` files will be transpiled with **Babel**.

### Sass

All files in `modules/**/sources/styles` will be process by **Sass**.

### Placeholders

Files specified in `broccoli/modules/dist-tree.js` will have injected placeholders.
Mappings are defied in `broccoli/utils.js`.
