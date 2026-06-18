import { EventAttributes } from '../ConvivaAnalyticsTracker';

function flatten(object: object, prefix: string = '') {
  const eventAttributes: EventAttributes = {};

  // Flatten the event object into a string-to-string dictionary with the object property hierarchy in dot notation
  const objectWalker = (subObject: Record<string, unknown>, subPrefix: string) => {
    for (const key in subObject) {
      if (Object.prototype.hasOwnProperty.call(subObject, key)) {
        const value = subObject[key];
        if (typeof value === 'object') {
          objectWalker(value as Record<string, unknown>, subPrefix + key + '.');
        } else {
          eventAttributes[subPrefix + key] = String(value);
        }
      }
    }
  };

  objectWalker(object as Record<string, unknown>, prefix);

  return eventAttributes;
}

export const ObjectUtils = {
  flatten,
};
