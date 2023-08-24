import { ObjectUtils } from '../../src/ts/helper/ObjectUtils';

describe('ObjectUtils', () => {
  describe('flatten', () => {
    const deepObject: object = {
      rootKey: {
        withNestedKey: 'andValue',
        onAll: {
          levels: '3',
        },
      },
      key: 'value',
    };

    it('converts a deep object to a flat object', () => {
      const flatObject = ObjectUtils.flatten(deepObject);
      expect(flatObject).toEqual(
        expect.objectContaining({
          'rootKey.withNestedKey': 'andValue',
          'rootKey.onAll.levels': '3',
          key: 'value',
        }),
      );
    });

    it('converts a deep object to a flat object with prefix', () => {
      const flatObject = ObjectUtils.flatten(deepObject, 'myPrefix_');
      expect(flatObject).toEqual(
        expect.objectContaining({
          'myPrefix_rootKey.withNestedKey': 'andValue',
          'myPrefix_rootKey.onAll.levels': '3',
          myPrefix_key: 'value',
        }),
      );
    });
  });
});
