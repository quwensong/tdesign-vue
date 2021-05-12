import Vue, { VNode, CreateElement } from 'vue';
import TIconChevronRight from '../icon/chevron-right';
import TIconLoading from '../icon/loading';
import TCheckBox from '../checkbox';
import TreeNode from '../../common/js/tree/tree-node';
import { getTNode } from './util';
import { TypeEventState } from './types';
import { TREE_NODE_NAME, CLASS_NAMES } from './constants';

export const TreeItemProps = {
  node: {
    type: TreeNode,
  },
  treeScope: {
    type: Object,
  },
};

export default Vue.extend({
  name: TREE_NODE_NAME,
  props: TreeItemProps,
  methods: {
    getStyles(): string {
      const { level } = this.node;
      const styles = `--level: ${level};`;
      return styles;
    },
    getClassList(): ClassName {
      const {
        node,
      } = this;
      const list = [];
      list.push(CLASS_NAMES.treeNode);
      list.push({
        [CLASS_NAMES.treeNodeOpen]: node.expanded,
        [CLASS_NAMES.actived]: node.isActivable() ? node.actived : false,
        [CLASS_NAMES.disabled]: node.isDisabled(),
      });
      return list;
    },
    renderLine(createElement: CreateElement): VNode {
      const { node, treeScope } = this;
      const { line, scopedSlots } = treeScope;
      const iconVisible = !!treeScope.icon;

      let lineNode = null;
      if (line === true) {
        if (scopedSlots?.line) {
          lineNode = scopedSlots.line({
            node: node?.getModel(),
          });
        } else if (node.parent && node.tree) {
          const {
            vmIsLeaf,
            vmIsFirst,
            level,
          } = node;

          const lineClasses = [];

          // 每个节点绘制抵达上一层级的折线
          lineClasses.push(CLASS_NAMES.line);

          // 叶子节点，折线宽度延长，因为没有 icon 呈现
          // 任意节点，icon 不呈现时也是要延长折线宽度
          if (vmIsLeaf || !iconVisible) {
            lineClasses.push(CLASS_NAMES.lineIsLeaf);
          }

          // 分支首节点，到上一节点的折线高度要缩短，让位给 icon 呈现
          // 如果 icon 隐藏了，则不必缩短折线高度
          if (vmIsFirst && iconVisible) {
            lineClasses.push(CLASS_NAMES.lineIsFirst);
          }

          // 如果节点的父节点，不是最后的节点
          // 则需要绘制节点延长线
          const shadowStyles: string[] = [];
          const parents = node.getParents();
          parents.pop();
          parents.forEach((pnode: TreeNode, index: number) => {
            if (!pnode.vmIsLast) {
              shadowStyles.push(`calc(-${index + 1} * var(--space)) 0 var(--color)`);
            }
          });

          const styles = {
            '--level': level,
            'box-shadow': shadowStyles.join(','),
          };

          lineNode = (
            <span
              class={lineClasses}
              style={styles}
            ></span>
          );
        }
      } else {
        lineNode = getTNode(line, {
          createElement,
          node,
        });
      }
      return lineNode;
    },
    renderIcon(createElement: CreateElement): VNode {
      const { node, treeScope } = this;
      const { icon, scopedSlots } = treeScope;

      let iconNode = null;
      if (icon === true) {
        if (scopedSlots?.icon) {
          iconNode = scopedSlots.icon({
            node: node?.getModel(),
          });
        } else {
          if (!node.vmIsLeaf) {
            iconNode = (<TIconChevronRight/>);
          } else {
            iconNode = '';
          }
        }
      } else {
        iconNode = getTNode(icon, {
          createElement,
          node,
        });
      }
      if (!node.vmIsLeaf && node.loading && node.expanded && icon !== false) {
        iconNode = (<TIconLoading/>);
      }
      iconNode = (
        <span
          class={CLASS_NAMES.treeIcon}
          trigger="expand"
          ignore="active"
        >{iconNode}</span>
      );
      return iconNode;
    },
    renderLabel(createElement: CreateElement): VNode {
      const { node, treeScope } = this;
      const  { label, scopedSlots } = treeScope;
      const checkProps = treeScope.checkProps || {};

      let labelNode = null;
      if (label === true) {
        if (scopedSlots?.label) {
          labelNode = scopedSlots.label({
            node: node?.getModel(),
          });
        } else {
          labelNode = node.label || '';
        }
      } else {
        labelNode = getTNode(label, {
          createElement,
          node,
        });
      }

      const labelClasses = [
        CLASS_NAMES.treeLabel,
        CLASS_NAMES.treeLabelStrictly,
      ];

      if (node.vmCheckable) {
        labelNode = (
          <TCheckBox
            class={labelClasses}
            checked={node.checked}
            indeterminate={node.indeterminate}
            disabled={node.isDisabled()}
            name={node.value}
            onChange={() => this.handleChange()}
            ignore="expand,active"
            {...{ props: checkProps }}
          >{labelNode}</TCheckBox>
        );
      } else {
        labelNode = (
          <span
            class={labelClasses}
          >{labelNode}</span>
        );
      }

      return labelNode;
    },
    renderOperations(createElement: CreateElement): VNode {
      const { node, treeScope } = this;
      const { operations, scopedSlots } = treeScope;

      let opNode = null;
      if (scopedSlots?.operations) {
        opNode = scopedSlots.operations({
          node: node?.getModel(),
        });
      } else {
        opNode = getTNode(operations, {
          createElement,
          node,
        });
      }
      if (opNode) {
        opNode = (
          <span
            class={CLASS_NAMES.treeOperations}
            ignore="active,expand"
          >{opNode}</span>
        );
      }
      return opNode;
    },
    renderItem(createElement: CreateElement): Array<VNode> {
      const itemNodes: Array<VNode> = [];

      const iconNode = this.renderIcon(createElement);

      // 渲染连线排在渲染图标之后，是为了确认图标是否存在
      const lineNode = this.renderLine(createElement);

      if (lineNode) {
        itemNodes.push(lineNode);
      }

      if (iconNode) {
        itemNodes.push(iconNode);
      }

      const labelNode = this.renderLabel(createElement);
      if (labelNode) {
        itemNodes.push(labelNode);
      }

      const spaceNode = (<span class={CLASS_NAMES.treeSpace}></span>);
      itemNodes.push(spaceNode);

      const opNode = this.renderOperations(createElement);
      if (opNode) {
        itemNodes.push(opNode);
      }

      return itemNodes;
    },
    handleClick(evt: MouseEvent) {
      const { node } = this;
      const state: TypeEventState = {
        mouseEvent: evt,
        event: evt,
        node,
        path: node.getPath(),
      };
      this.$emit('click', state);
    },
    handleChange() {
      const { node } = this;
      const event = new Event('change');
      const state: TypeEventState = {
        event,
        node,
      };
      this.$emit('change', state);
    },
  },
  render(createElement: CreateElement) {
    const {
      node,
    } = this;

    const {
      tree,
      level,
      value,
    } = node;

    if (!tree || !tree.nodeMap.get(value)) {
      this.$destroy();
    }
    const styles = this.getStyles();
    const classList = this.getClassList();
    return (
      <div
        class={classList}
        data-value={node.value}
        data-level={level}
        style={styles}
        onClick={(evt: MouseEvent) => this.handleClick(evt)}
      >{this.renderItem(createElement)}</div>
    );
  },
});