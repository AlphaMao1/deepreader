import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { type Skill, useCreateSkill, useUpdateSkill } from "../hooks/use-skills";

interface SkillEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  skill?: Skill | null;
}

export default function SkillEditorDialog({ isOpen, onClose, skill }: SkillEditorDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);

  const createSkillMutation = useCreateSkill();
  const updateSkillMutation = useUpdateSkill();

  const isEditing = !!skill;
  const isSystemSkill = !!skill?.isSystem;
  const isLoading = createSkillMutation.isPending || updateSkillMutation.isPending;

  useEffect(() => {
    if (isOpen) {
      if (skill) {
        setName(skill.name);
        setDescription(skill.description ?? "");
        setContent(skill.content);
        setIsActive(skill.isActive);
      } else {
        setName("");
        setDescription("");
        setContent("");
        setIsActive(true);
      }
    }
  }, [isOpen, skill]);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;

    try {
      if (isEditing) {
        await updateSkillMutation.mutateAsync({
          id: skill.id,
          data: {
            name: isSystemSkill ? skill.name : name.trim(),
            description: description.trim(),
            content: content.trim(),
            isActive: isSystemSkill ? skill.isActive : isActive,
          },
        });
      } else {
        await createSkillMutation.mutateAsync({
          name: name.trim(),
          description: description.trim(),
          content: content.trim(),
          isActive,
        });
      }
      onClose();
    } catch (error) {
      console.error("保存技能失败:", error);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[85vh] select-none sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            <div className="flex items-center space-x-2">
              <span>{isEditing ? (isSystemSkill ? "编辑系统技能" : "编辑技能") : "新建技能"}</span>
              {!isSystemSkill && (
                <div className="flex items-center space-x-2">
                  <Switch id="skill-active" checked={isActive} onCheckedChange={setIsActive} disabled={isLoading} />
                  <Label htmlFor="skill-active" className="cursor-pointer">
                    启用此技能
                  </Label>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-3 py-4">
          {/* 技能名称 */}
          <div className="space-y-2">
            <Label htmlFor="skill-name">技能名称</Label>
            <Input
              id="skill-name"
              placeholder="例如：生成思维导图"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading || isSystemSkill}
              autoFocus={!isSystemSkill}
              className={isSystemSkill ? "cursor-not-allowed opacity-60" : ""}
            />
            {isSystemSkill && <p className="text-muted-foreground text-xs">系统技能名称不可修改</p>}
          </div>

          {/* 触发描述（仅用户技能显示） */}
          {!isSystemSkill && (
            <div className="space-y-2">
              <Label htmlFor="skill-description">
                触发描述
                <span className="text-muted-foreground ml-1 font-normal text-xs">（AI 靠这段判断何时调用此技能）</span>
              </Label>
              <Input
                id="skill-description"
                placeholder="例如：用户要求生成思维导图或知识图谱时触发，将当前讨论转为 Mermaid 结构。"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-muted-foreground text-xs leading-relaxed">
                1-2 句话说明<strong>触发场景和输出效果</strong>。只有这段会被注入 AI 提示词用于触发判断；完整步骤在触发后才读取，不影响日常 token 消耗。
              </p>
            </div>
          )}

          {/* 技能内容 */}
          <div className="space-y-2">
            <Label htmlFor="skill-content">
              技能内容
              <span className="text-muted-foreground ml-1 font-normal text-xs">（完整工作流，Markdown 格式）</span>
            </Label>
            <Textarea
              id="skill-content"
              placeholder={`# 技能名称\n\n## 步骤\n\n1. 第一步\n2. 第二步\n\n## 约束\n\n- 禁止做 X`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isLoading}
              className="h-[320px] resize-none font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel} disabled={isLoading}>
            取消
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim() || !content.trim() || isLoading}>
            {isLoading ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
