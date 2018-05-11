System.baseURL = '/modules/';
System.config({
  defaultJSExtensions: true,
});

let app;
System.import('core/app').then(({ default: App }) => {
  app = new App({});
  app.start();
});
