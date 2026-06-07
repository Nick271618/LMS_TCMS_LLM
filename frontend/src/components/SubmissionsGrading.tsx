import { Button, List, Modal, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { stepsApi, type StepSubmission } from "../api/courses";
import SubmissionReviewDrawer from "./SubmissionReviewDrawer";

type Props = { stepId: string; open: boolean; onClose: () => void };

export default function SubmissionsGrading({ stepId, open, onClose }: Props) {
  const [subs, setSubs] = useState<StepSubmission[]>([]);
  const [reviewId, setReviewId] = useState<string | null>(null);

  const load = () => {
    stepsApi.listSubmissions(stepId).then(setSubs).catch(() => message.error("Ошибка загрузки"));
  };

  useEffect(() => {
    if (open) load();
  }, [open, stepId]);

  return (
    <>
      <Modal title="Работы студентов" open={open} onCancel={onClose} footer={null} width={720}>
        <Typography.Paragraph type="secondary">
          <Link to="/cabinet/teacher">Открыть полный кабинет →</Link>
        </Typography.Paragraph>
        <List
          dataSource={subs}
          locale={{ emptyText: "Пока нет сдач" }}
          renderItem={(s) => (
            <List.Item
              actions={[
                <Button key="r" type="link" onClick={() => setReviewId(s.id)}>
                  {s.status === "submitted" ? "Оценить" : "Просмотр"}
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={`${s.user_name} (${s.user_email})`}
                description={
                  <>
                    <Typography.Text type="secondary">
                      Статус: {s.status}
                      {s.grading_source === "llm" && (
                        <>
                          {" "}
                          <Tag color="blue">ИИ</Tag>
                        </>
                      )}
                    </Typography.Text>
                    {s.status === "graded" && (
                      <div>
                        Баллы: {s.score}/{s.max_score}
                      </div>
                    )}
                  </>
                }
              />
            </List.Item>
          )}
        />
      </Modal>
      <SubmissionReviewDrawer
        submissionId={reviewId}
        open={!!reviewId}
        onClose={() => setReviewId(null)}
        canGrade
        onGraded={load}
      />
    </>
  );
}
