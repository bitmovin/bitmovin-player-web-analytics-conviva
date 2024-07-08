import { EventAttributes } from '../ConvivaAnalyticsTracker';

export namespace ObjectUtils {
  export function flatten(object: any, prefix: string = '') {
    const eventAttributes: EventAttributes = {};

    // Flatten the event object into a string-to-string dictionary with the object property hierarchy in dot notation
    const objectWalker = (object: any, prefix: string) => {
      for (const key in object) {
        if (object.hasOwnProperty(key)) {
          const value = object[key];
          if (typeof value === 'object') {
            objectWalker(value, prefix + key + '.');
          } else {
            eventAttributes[prefix + key] = String(value);
          }
        }
      }
    };

    objectWalker(object, prefix);

    return eventAttributes;
  }
}
