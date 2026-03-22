const date = new Date()

export const useMonths = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
export const useDays = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi" ]

// Retourne la date au format JJ/MM/AAAA.
export const useFormattedDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

// Retourne le nombre de jours du mois cible.
export const useDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month + 1, 0).getDate()
}

// Retourne le nom du mois a partir de son index JS (0-11).
export const useMonthName = (monthNumber: number) => useMonths[monthNumber]

// Retourne l'index JS du mois a partir de son nom.
export const useMonthNumber = (monthName: string) => useMonths.indexOf(monthName)

// Retourne le nom du jour de la semaine.
export const useDayNumber = (date: number, month: number, year: number) => {
  const d = new Date(year, month, date)
  return useDays[d.getDay()]
}

// Valeurs courantes basees sur la date du moment.
export const useCurrentDate = date.getDate()
export const useCurrentDayNumber = date.getDay()
export const useCurrentDay = useDays[date.getDay()]
export const useCurrentMonth = date.getMonth()
export const useCurrentYear = date.getFullYear()