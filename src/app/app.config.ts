import {APP_INITIALIZER, ApplicationConfig} from "@angular/core";
import {PreloadAllModules, provideRouter, RouteReuseStrategy, withPreloading} from "@angular/router";

import { routes } from "./app.routes";
import {IonicRouteStrategy} from "@ionic/angular";
import {provideIonicAngular} from "@ionic/angular/standalone";
import {DatabaseService, initDbFactory} from "./services/database.service";

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: RouteReuseStrategy, useClass: IonicRouteStrategy
    },
    DatabaseService,
    {
      provide: APP_INITIALIZER,
      useFactory: initDbFactory,
      deps: [DatabaseService],
      multi: true,
    },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
