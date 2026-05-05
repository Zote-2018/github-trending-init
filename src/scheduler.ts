import { execSync } from 'child_process';
import * as path from 'path';

const TASK_NAME = 'GitHubTrendingDaily';
const SCRIPT_PATH = path.resolve(__dirname, '..', 'node_modules', '.bin', 'tsx');
const ENTRY_PATH = path.resolve(__dirname, 'index.ts');

function register() {
  const cmd = `schtasks /create /tn "${TASK_NAME}" /tr "node \\"${SCRIPT_PATH}\\" \\"${ENTRY_PATH}\\"" /sc daily /st 01:00 /f`;
  try {
    execSync(cmd, { encoding: 'utf-8', shell: 'cmd.exe' });
    console.log(`✅ 任务计划已注册: ${TASK_NAME}，每天凌晨 1:00 执行`);
  } catch (err: any) {
    console.error(`❌ 注册失败: ${err.message}`);
    console.error('💡 尝试以管理员身份运行');
    process.exit(1);
  }
}

function unregister() {
  const cmd = `schtasks /delete /tn "${TASK_NAME}" /f`;
  try {
    execSync(cmd, { encoding: 'utf-8', shell: 'cmd.exe' });
    console.log(`✅ 任务计划已删除: ${TASK_NAME}`);
  } catch (err: any) {
    console.error(`❌ 删除失败 (可能不存在): ${err.message}`);
    process.exit(1);
  }
}

const action = process.argv[2];
if (action === 'register') register();
else if (action === 'unregister') unregister();
else {
  console.log('Usage: tsx scheduler.ts <register|unregister>');
  process.exit(1);
}
