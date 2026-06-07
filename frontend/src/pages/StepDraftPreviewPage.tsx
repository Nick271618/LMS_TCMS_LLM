import { Button, Card, Space, Spin, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { llmApi, type StepDraft } from "../api/llm";
import UiPracticePlayer from "../components/UiPracticePlayer";
import { ru } from "../i18n/ru";

export default function StepDraftPreviewPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<StepDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!token) return;
    llmApi
      .getDraftByToken(token)
      .then(setDraft)
      .catch((e) => message.error(e instanceof Error ? e.message : ru.uiPractice.loadError))
      .finally(() => setLoading(false));
  }, [token]);

  const confirm = async () => {
    if (!draft?.lesson) {
      message.warning(ru.uiPractice.noLessonForConfirm);
      return;
    }
    setConfirming(true);
    try {
      const updated = await llmApi.confirmDraft(draft.id, draft.lesson);
      message.success(ru.uiPractice.confirmed);
      if (updated.teach_lesson_url) {
        navigate(updated.teach_lesson_url);
      }
    } catch (e) {
      message.error(e instanceof Error ? e.message : ru.uiPractice.confirmError);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;
  if (!draft) return <Typography.Text>{ru.uiPractice.notFound}</Typography.Text>;

  return (
    <Space direction="vertical" size="large" style={{ width: "100%", maxWidth: 900 }}>
      <Link to="/teach">← Преподавание</Link>
      <Typography.Title level={3}>{ru.uiPractice.previewTitle}</Typography.Title>
      {draft.rationale && (
        <Typography.Paragraph type="secondary">{draft.rationale}</Typography.Paragraph>
      )}
      <UiPracticePlayer content={draft.content} title={draft.title} preview />
      <Card size="small">
        <Space wrap>
          {draft.teach_lesson_url && (
            <Link to={draft.teach_lesson_url}>{ru.uiPractice.backToLesson}</Link>
          )}
          {draft.lesson && (
            <Button type="primary" loading={confirming} onClick={confirm}>
              {ru.uiPractice.addToLesson}
            </Button>
          )}
        </Space>
      </Card>
    </Space>
  );
}
