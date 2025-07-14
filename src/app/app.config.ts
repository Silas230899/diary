import { ApplicationConfig } from "@angular/core";
import {PreloadAllModules, provideRouter, RouteReuseStrategy, withPreloading} from "@angular/router";

import { routes } from "./app.routes";
import {IonicRouteStrategy} from "@ionic/angular";
import {provideIonicAngular} from "@ionic/angular/standalone";

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: RouteReuseStrategy, useClass: IonicRouteStrategy
    },
    provideIonicAngular(),
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
