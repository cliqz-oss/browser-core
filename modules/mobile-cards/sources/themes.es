const colors = {
  black: 'rgb(0, 0, 0)',
  blackish: 'rgb(84, 84, 84)',
  green: 'rgb(71, 182, 37)',
  grey: 'rgb(51, 51, 51)',
  red: 'rgb(217, 85, 89)',
  lightGrey: 'rgb(166, 166, 166)'
};

export default {
  dark: {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0)'
    },
    card: {
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      headerBgColor: 'rgba(0, 0, 0, 0.7)',
      headerTxtColor: '#fff',
      headerBorder: 0,
      borderColor: '#383D40',
    },
    separatorColor: '#383D40',
    highlightedBackgroundColor: 'rgba(0, 0, 0, 0.7)',
    textColor: '#ffffff',
    tapToCopyColor: '#ffffff',
    subHeader: '#fff',
    images: {
      backgroundColor: 'rgba(0, 0, 0, 0.25)',
      border: 0
    },
    cinema: {
      movieTxtColor: '#fff',
      showBgColor: '#00AEF0'
    },
    local: {
      distanceTxtColor: '#fff'
    },
    soccer: {
      container: 'rgba(0, 0, 0, 0.7)',
      mainText: '#fff',
      subText: '#fff'
    },
    weather: {
      dayTxtColor: '#fff',
      tempTxtColor: '#fff',
      maxMinTxtColor: '#fff'
    },
    lotto: {
      highlightColor: 'rgba(0, 0, 0, 0.7)',
      subText: '#fff'
    },
    movieData: {
      txtColor: '#fff'
    },
    flight: {
      updated: '#fff',
      statusTime: '#fff',
      routeRemaining: '#fff',
      cityAndDate: '#fff',
      label: '#fff',
      time: '#fff',
      info: '#fff'
    }
  },
  light: {
    container: {
      backgroundColor: 'rgba(0, 0, 0, 0)'
    },
    card: {
      backgroundColor: 'rgba(255, 255, 255, 1)',
      headerBgColor: '#fff',
      headerTxtColor: '#000',
      headerBorder: 1.5,
      borderColor: '#EDECEC'
    },
    separatorColor: '#EDECEC',
    highlightedBackgroundColor: 'rgba(255, 255, 255, 0.7)',
    textColor: '#000000',
    tapToCopyColor: '#666',
    subHeader: '#666',
    images: {
      backgroundColor: 'rgba(255, 255, 255, 0.25)',
      border: 0.5
    },
    cinema: {
      movieTxtColor: '#0C2B4A',
      showBgColor: '#F5F5F5'
    },
    local: {
      distanceTxtColor: '#00AEF0'
    },
    soccer: {
      container: '#f5f5f5',
      mainText: '#000',
      subText: '#999'
    },
    weather: {
      dayTxtColor: '#474747',
      tempTxtColor: '#000',
      maxMinTxtColor: '#8A8A8A'
    },
    lotto: {
      highlightColor: '#eee',
      subText: '#565656'
    },
    movieData: {
      txtColor: '#0C2B4A'
    },
    flight: {
      updated: colors.lightGrey,
      statusTime: colors.grey,
      routeRemaining: colors.blackish,
      cityAndDate: colors.blackish,
      label: colors.lightGrey,
      time: colors.black,
      info: colors.blackish
    }
  }
};
