# Klippa Grid Framework 

This is the repository for building and developing [@klippa/ngx-grid](https://www.npmjs.com/package/@klippa/ngx-grid).
How to use the library is documented in [projects/klippa/ngx-grid/README.md](projects/klippa/ngx-grid/README.md)

## Structure

The actual library is in `projects/klippa/ngx-grid`. You might notice that there is a `package.json` both in the root
of the repo, and in the library. This is important. 

The root `package.json` is used for building the angular library. Any dependencies that are only 
required to _compile_ the library and are not needed at runtime should be specified here.

The `/projects/klippa/ngx-grid/package.json` is used for publishing and using the library. Any dependencies that would
be required at runtime should be specified here as `peerDependencies`. Angular will not allow normal `dependencies` here.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
