export const SEARCH_PARAMS = new URLSearchParams(window.location.search);
export const IS_POPUP = SEARCH_PARAMS.get('popup') !== null;
export const MAX_WINDOW_HEIGHT = 600;
export const MAX_WINDOW_HEIGHT_AUTOTRIGGER = 650;
