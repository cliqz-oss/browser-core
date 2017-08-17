import { Dimensions } from 'react-native';


export const { width: viewportWidth, height: viewportHeight } = Dimensions.get('window');


export function widthPercentage (percentage) {
    const value = (percentage * viewportWidth) / 100;
    return Math.round(value);
}

export const cardWidth = widthPercentage(100);
export const cardsGap = widthPercentage(10);
