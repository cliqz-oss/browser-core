import { Dimensions } from 'react-native';


export const { width: vpWidth, height: vpHeight } = Dimensions.get('window');


export function widthPercentage (percentage) {
    const value = (percentage * vpWidth) / 100;
    return Math.round(value);
}

export const cardWidth = widthPercentage(80);
export const cardsGap = widthPercentage(5);
