import { Dimensions } from 'react-native';


export const { width: vpWidth, height: vpHeight } = Dimensions.get('window');


export function widthPercentage(percentage) {
  const value = (percentage * getVPWidth()) / 100;
  return Math.round(value);
}

export function getCardWidth() {
  return widthPercentage(84);
}

export const cardWidth = () => getCardWidth();
export const cardsGap = widthPercentage(4);

export function getVPWidth() {
  return Dimensions.get('window').width;
}
export function getVPHeight() {
  return Dimensions.get('window').height;
}

export const elementSideMargins = {
  marginLeft: 12,
  marginRight: 12,
};

export const elementSidePaddings = {
  paddingLeft: 12,
  paddingRight: 12,
};

export const elementTopMargin = {
  marginTop: 14,
};

export const cardBorderTopRadius = {
  borderTopLeftRadius: 5,
  borderTopRightRadius: 5,
};

export const cardBorderBottomRadius = {
  borderBottomLeftRadius: 5,
  borderBottomRightRadius: 5,
};

export const cardMargins = {
  marginBottom: 5,
  marginTop: 5,
};

export const descriptionTextColor = '#0C2B4A';
