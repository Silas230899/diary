import { Pipe, PipeTransform } from '@angular/core';
import {DatabaseService} from "../services/database.service";

@Pipe({
  name: 'imageNameToObjectURL'
})
export class ImageNameToObjectURLPipe implements PipeTransform {
  
  constructor(private dbService: DatabaseService) {}

  async transform(filename: string, ...args: unknown[]) {
    return this.dbService.getImageObjectURL(filename)
  }

}
