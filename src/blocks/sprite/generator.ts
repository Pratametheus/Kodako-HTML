import * as Blockly from 'blockly/core';
import { javascriptGenerator, Order } from 'blockly/javascript';

export type ThreadCode = {
  hatType: 'green_flag' | 'clicked' | 'key' | 'receive';
  key?: string;
  message?: string;
  blockId: string;
  fnName: string;
  code: string;
};

const HATS: Record<string, ThreadCode['hatType']> = {
  sprite_hat_green_flag: 'green_flag',
  sprite_hat_clicked: 'clicked',
  sprite_hat_key: 'key',
  sprite_hat_receive: 'receive',
};

export function registerSpriteGenerators(): void {
  const g = javascriptGenerator;
  g.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
  g.addReservedWords('highlightBlock,__yield__,api,Math');
  (g as unknown as { INFINITE_LOOP_TRAP: string | null }).INFINITE_LOOP_TRAP = null;

  const valNum = (b: Blockly.Block, name: string) => g.valueToCode(b, name, Order.NONE) || '0';
  const valAny = (b: Blockly.Block, name: string) => g.valueToCode(b, name, Order.NONE) || "''";
  const valBool = (b: Blockly.Block, name: string) => g.valueToCode(b, name, Order.NONE) || 'false';

  g.forBlock['sprite_move'] = (b) => `move(${valNum(b, 'STEPS')});\n`;
  g.forBlock['sprite_turn_right'] = (b) => `turnRight(${valNum(b, 'DEG')});\n`;
  g.forBlock['sprite_turn_left'] = (b) => `turnLeft(${valNum(b, 'DEG')});\n`;
  g.forBlock['sprite_goto_xy'] = (b) => `gotoXY(${valNum(b, 'X')}, ${valNum(b, 'Y')});\n`;
  g.forBlock['sprite_change_x'] = (b) => `changeX(${valNum(b, 'DX')});\n`;
  g.forBlock['sprite_change_y'] = (b) => `changeY(${valNum(b, 'DY')});\n`;
  g.forBlock['sprite_point_direction'] = (b) => `pointInDirection(${valNum(b, 'DIR')});\n`;
  g.forBlock['sprite_glide'] = (b) =>
    `glide(${valNum(b, 'SECS')}, ${valNum(b, 'X')}, ${valNum(b, 'Y')});\n`;
  g.forBlock['sprite_bounce_edge'] = () => `bounceIfOnEdge();\n`;

  g.forBlock['sprite_say'] = (b) => `say(${valAny(b, 'TEXT')});\n`;
  g.forBlock['sprite_say_for'] = (b) => `sayForSecs(${valAny(b, 'TEXT')}, ${valNum(b, 'SECS')});\n`;
  g.forBlock['sprite_say_clear'] = () => `sayClear();\n`;
  g.forBlock['sprite_switch_costume'] = (b) =>
    `switchCostume(${JSON.stringify(b.getFieldValue('COSTUME'))});\n`;
  g.forBlock['sprite_next_costume'] = () => `nextCostume();\n`;
  g.forBlock['sprite_change_size'] = (b) => `changeSize(${valNum(b, 'DELTA')});\n`;
  g.forBlock['sprite_set_size'] = (b) => `setSize(${valNum(b, 'PCT')});\n`;
  g.forBlock['sprite_show'] = () => `show();\n`;
  g.forBlock['sprite_hide'] = () => `hide();\n`;

  g.forBlock['sprite_wait'] = (b) => `wait(${valNum(b, 'SECS')});\n`;
  g.forBlock['sprite_repeat'] = (b) => {
    const n = valNum(b, 'TIMES');
    const body = g.statementToCode(b, 'DO');
    const i = g.nameDB_!.getDistinctName('i', Blockly.Names.NameType.VARIABLE);
    return `for (var ${i} = 0; ${i} < (${n}); ${i}++) {\n${body}__yield__();\n}\n`;
  };
  g.forBlock['sprite_forever'] = (b) => {
    const body = g.statementToCode(b, 'DO');
    return `while (true) {\n${body}__yield__();\n}\n`;
  };
  g.forBlock['sprite_if'] = (b) => `if (${valBool(b, 'COND')}) {\n${g.statementToCode(b, 'DO')}}\n`;
  g.forBlock['sprite_if_else'] = (b) =>
    `if (${valBool(b, 'COND')}) {\n${g.statementToCode(b, 'DO')}} else {\n${g.statementToCode(b, 'ELSE')}}\n`;
  g.forBlock['sprite_wait_until'] = (b) => `while (!(${valBool(b, 'COND')})) {\n__yield__();\n}\n`;
  g.forBlock['sprite_stop'] = (b) => {
    const target = b.getFieldValue('TARGET');
    return target === 'this' ? `stop('this');\nreturn;\n` : `stop(${JSON.stringify(target)});\n`;
  };

  g.forBlock['sprite_broadcast'] = (b) => `broadcast(${JSON.stringify(b.getFieldValue('MSG'))});\n`;
  g.forBlock['sprite_broadcast_wait'] = (b) =>
    `broadcastAndWait(${JSON.stringify(b.getFieldValue('MSG'))});\n`;

  g.forBlock['sprite_op_arith'] = (b) => {
    const a = valNum(b, 'A');
    const c = valNum(b, 'B');
    const op = { add: '+', sub: '-', mul: '*', div: '/' }[b.getFieldValue('OP') as string] ?? '+';
    return [`((${a}) ${op} (${c}))`, Order.ATOMIC];
  };
  g.forBlock['sprite_op_mod'] = (b) => [
    `((${valNum(b, 'A')}) % (${valNum(b, 'B')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_compare'] = (b) => {
    const a = valAny(b, 'A');
    const c = valAny(b, 'B');
    const op = { lt: '<', eq: '===', gt: '>' }[b.getFieldValue('OP') as string] ?? '===';
    return [`((${a}) ${op} (${c}))`, Order.ATOMIC];
  };
  g.forBlock['sprite_op_and'] = (b) => [
    `((${valBool(b, 'A')}) && (${valBool(b, 'B')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_or'] = (b) => [
    `((${valBool(b, 'A')}) || (${valBool(b, 'B')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_not'] = (b) => [`(!(${valBool(b, 'A')}))`, Order.ATOMIC];
  g.forBlock['sprite_op_random'] = (b) => [
    `(Math.floor(Math.random() * (((${valNum(b, 'TO')}) - (${valNum(b, 'FROM')})) + 1)) + (${valNum(b, 'FROM')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_join'] = (b) => [
    `(String(${valAny(b, 'A')}) + String(${valAny(b, 'B')}))`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_op_length'] = (b) => [`(String(${valAny(b, 'A')}).length)`, Order.ATOMIC];

  g.forBlock['sprite_sensing_key'] = (b) => [
    `isKeyPressed(${JSON.stringify(b.getFieldValue('KEY'))})`,
    Order.ATOMIC,
  ];
  g.forBlock['sprite_sensing_timer'] = () => [`timer()`, Order.ATOMIC];
  g.forBlock['sprite_sensing_reset_timer'] = () => `resetTimer();\n`;

  g.forBlock['variables_get'] = (b) => [
    `getVar(${JSON.stringify(b.getField('VAR')!.getText())})`,
    Order.ATOMIC,
  ];
  g.forBlock['variables_set'] = (b) =>
    `setVar(${JSON.stringify(b.getField('VAR')!.getText())}, ${valAny(b, 'VALUE')});\n`;
  g.forBlock['math_change'] = (b) =>
    `changeVar(${JSON.stringify(b.getField('VAR')!.getText())}, ${valNum(b, 'DELTA')});\n`;
}

export function generateThreads(workspace: Blockly.Workspace): ThreadCode[] {
  const g = javascriptGenerator;
  g.init(workspace);
  const threads: ThreadCode[] = [];
  const tops = workspace.getTopBlocks(true).filter((block) => block.type in HATS);
  tops.forEach((hat, index) => {
    const hatType = HATS[hat.type]!;
    const first = hat.getNextBlock();
    const body = first ? g.blockToCode(first) : '';
    const bodyStr = (Array.isArray(body) ? body[0] : body).replaceAll('`', '\\x60');
    const fnName = `hat_${hatType}_${index}`;
    threads.push({
      hatType,
      key: hat.type === 'sprite_hat_key' ? hat.getFieldValue('KEY') : undefined,
      message: hat.type === 'sprite_hat_receive' ? hat.getFieldValue('MSG') : undefined,
      blockId: hat.id,
      fnName,
      code: `function ${fnName}() {\n${bodyStr}}\n`,
    });
  });
  g.finish('');
  return threads;
}
