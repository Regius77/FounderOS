// One file per UI area so translations can be edited in parallel. Later files win on a clash.
import shell from './shell';
import lab from './lab';
import creative from './creative';
import growth from './growth';
import workforce from './workforce';
import workspace from './workspace';
import business from './business';
import system from './system';

const it: Record<string, string> = { ...shell, ...lab, ...creative, ...growth, ...workforce, ...workspace, ...business, ...system };
export default it;
