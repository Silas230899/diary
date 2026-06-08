function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getUTCDate() === date2.getUTCDate() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCFullYear() === date2.getUTCFullYear()
  );
}

export function formatWrittenDate(date: string, written: string | null, writtenHasTime: boolean | null) {
  const nbsp = '\u00A0'
  if(written !== null) {
    if(isSameDay(new Date(date), new Date(written))) {
      if(writtenHasTime !== null && writtenHasTime) {
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "UTC",
        }
        return `Heute (${new Date(written).toLocaleTimeString(undefined, timeOptions).replaceAll(" ", nbsp)}${nbsp}Uhr)`
      } else {
        return `Heute (unbekannte${nbsp}Uhrzeit)`
      }
    } else {
      if(writtenHasTime !== null && writtenHasTime) {
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
        const dateString = new Date(written).toLocaleDateString(undefined, dateOptions).replaceAll(" ", nbsp)
        const timeString = new Date(written).toLocaleTimeString(undefined, timeOptions)
        
        return `${dateString} (${timeString}${nbsp}Uhr)`
      } else {
        const options: Intl.DateTimeFormatOptions = {
          day: "2-digit",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        }
        return `${new Date(written).toLocaleDateString(undefined, options).replaceAll(" ", nbsp)} (unbekannte${nbsp}Uhrzeit)`
      }
    }
  } else {
    return "Unbekannt"
  }
}
