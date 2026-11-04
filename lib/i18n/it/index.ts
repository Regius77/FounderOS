// One file per UI area so translations can be edited in parallel. Later files win on a clash: fixes.ts holds the cross-area decisions and wins.
import shell from './shell';
import lab from './lab';
import creative from './creative';
import growth from './growth';
import workforce from './workforce';
import workspace from './workspace';
import business from './business';
import system from './system';
import lib from './lib';
import status from './status';
import fixes from './fixes';

const it: Record<string, string> = { ...shell, ...lab, ...creative, ...growth, ...workforce, ...workspace, ...business, ...system, ...lib, ...status, ...fixes };
export default it;
