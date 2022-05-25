export const Name = "花园";

export interface Rule {
  enable: boolean;
  // 哪几块地需要种植迷人藤 例如 只要第一块和第八块 [1, 8]
  lands: number[];
  // 根据V币数量计算应该种植的数量
  auto_calculate: boolean;
  // 药水最多用多少次
  max_count: number;
  // 0: 不自动使用土地药水 1: 自动使用土地药水
  use_land_tool: boolean;
  // 土地药水id
  land_tool_id: number;
  // 0: 不自动使用加速药水 1: 自动使用加速药水
  use_speed_tool: boolean;
  // 0: 不自动使用叶子药水 1: 自动使用掌状复叶药水
  use_leaf_tool: boolean;
  // 叶子药水id
  leaf_tool_id: number;
  // 0: 不自动展示最高魅力值的花藤 1: 自动展示最高魅力值的花藤
  auto_show: boolean;
  // 0: 不自动出售花藤 1: 自动出售花藤
  auto_sale: boolean;
  // 出售时最少保留几个迷人藤
  save_amount: number;
}

export const defaultRule: Rule = {
  enable: false,
  lands: [1, 2, 3, 4, 5, 6, 7, 8],
  auto_calculate: true,
  max_count: 60,
  use_land_tool: true,
  land_tool_id: 1,
  use_speed_tool: false,
  use_leaf_tool: true,
  leaf_tool_id: 24,
  auto_show: false,
  auto_sale: true,
  save_amount: 0,
};

export const VipLands = [1, 2, 3, 4, 5, 6, 7, 8];
