/// <reference path='../src/ts/Conviva.d.ts'/>

import { ConvivaAnalytics } from '../src/ts';
import { TestHelper } from './TestHelper';

describe('sendCustomApplicationEvent()', () => {

  beforeEach(() => {
    TestHelper.mockConviva();
  });

  it('sends custom application event', () => {
    const clientMock = TestHelper.getConvivaClientMock();
    let convivaAnalytics = new ConvivaAnalytics(TestHelper.getPlayerMock() as any, 'TEST-KEY');

    convivaAnalytics.sendCustomApplicationEvent('Test Event');
    expect(clientMock.sendCustomEvent).toHaveBeenCalledWith(-2, 'Test Event', {});
  });

});
