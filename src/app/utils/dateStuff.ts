function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getUTCDate() === date2.getUTCDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

export function formatDatetime(date: string, written: string | null, writtenHasTime: boolean | null) {
  if(written !== null) {
    if(isSameDay(new Date(date), new Date(written))) {
      if(writtenHasTime!) {
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }
        return "Heute (" + new Date(written).toLocaleTimeString(undefined, timeOptions) + " Uhr)"
      } else {
        return "Heute (unbekannte Uhrzeit)"
      }
    } else {
      if(writtenHasTime!) {
        const dateOptions: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "UTC",
        }
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }
        const dateString = new Date(written).toLocaleDateString(undefined, dateOptions)
        const timeString = new Date(written).toLocaleTimeString(undefined, timeOptions)
        
        return `${dateString} (${timeString} Uhr)`
      } else {
        const options: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }
        return new Date(written).toLocaleDateString(undefined, options) + " (unbekannte Uhrzeit)"
      }
    }
  } else {
    return "Unbekannt"
  }
}
