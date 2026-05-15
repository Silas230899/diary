import { Pipe, PipeTransform } from '@angular/core';
import {formatWrittenDate} from "../utils/dateStuff";

@Pipe({
  name: 'formatWrittenDate'
})
export class FormatWrittenDatePipe implements PipeTransform {

  transform(date: string, written: string | null, writtenHasTime: boolean | null): string {
    return formatWrittenDate(date, written, writtenHasTime);
  }

}
