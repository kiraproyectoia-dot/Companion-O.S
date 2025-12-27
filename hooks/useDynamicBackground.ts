import { LILY_BACKGROUND_MEDIA_URL } from '../constants';

/**
 * A custom hook that provides a static background media URL.
 * The dynamic fetching logic has been replaced to use a single, reliable,
 * embedded media source, removing the need for geolocation or network requests for the background.
 */
export const useDynamicBackground = () => {
  return { imageUrl: LILY_BACKGROUND_MEDIA_URL };
};