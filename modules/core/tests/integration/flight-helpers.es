export const colors = {
  black: 'rgb(0, 0, 0)',
  blackish: 'rgb(84, 84, 84)',
  green: 'rgb(71, 182, 37)',
  grey: 'rgb(51, 51, 51)',
  red: 'rgb(217, 85, 89)',
  lightGrey: 'rgb(166, 166, 166)'
};

export const flightMatrix = {
  arrivedAllEarly: {
    name: 'departed and arrived early',
    statusColor: colors.green,
    icon: 'green-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.green,
      }
    },
    arrival: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.green,
      }
    }
  },
  arrivedAllLate: {
    name: 'departed and arrived late',
    statusColor: colors.green,
    icon: 'green-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.red,
      }
    },
    arrival: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.red,
      }
    }
  },
  arrivedDepEarlyArrLate: {
    name: 'departed early and arrived late',
    statusColor: colors.green,
    icon: 'green-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.green,
      }
    },
    arrival: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.red,
      }
    }
  },
  arrivedOnTime: {
    name: 'arrived on time',
    statusColor: colors.green,
    icon: 'green-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.green,
      }
    }
  },
  cancelled: {
    name: 'has been cancelled',
    statusColor: colors.red,
    icon: 'red-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  delayedDepEarly: {
    name: 'has been delayed after early departure',
    statusColor: colors.red,
    icon: 'red',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.green,
      }
    },
    arrival: {
      estimate: {
        isShown: true,
        color: colors.grey,
      },
      actual: {
        color: colors.red,
      }
    }
  },
  delayedNoUpdates: {
    name: 'has been delayed without updates',
    statusColor: colors.red,
    icon: 'red',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  diverted: {
    name: 'has been diverted',
    statusColor: colors.red,
    icon: 'red',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  noInfo: {
    name: 'has no information',
    statusColor: colors.lightGrey,
    icon: false,
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  onTimeDepEarly: {
    name: 'is on time after early departure',
    statusColor: colors.green,
    icon: 'green',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey
      },
      actual: {
        color: colors.green,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  onTimeDepLate: {
    name: 'is on time after late departure',
    statusColor: colors.green,
    icon: 'green',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: true,
        color: colors.grey
      },
      actual: {
        color: colors.red,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
  scheduled: {
    name: 'is scheduled',
    statusColor: colors.green,
    icon: 'green-outline',
    airport: colors.grey,
    depart: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    },
    arrival: {
      estimate: {
        isShown: false,
      },
      actual: {
        color: colors.grey,
      }
    }
  },
};
