import {
  Alert,
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from "antd";
import { useMemo, useState } from "react";
import { stepsApi, type Step } from "../api/courses";
import type { UiField, UiPracticeContent } from "../api/llm";
import { ru } from "../i18n/ru";
import RichHtmlViewer from "./RichHtmlViewer";
import TestCaseForm from "./TestCaseForm";

type Props = {
  step?: Step;
  content?: UiPracticeContent;
  title?: string;
  preview?: boolean;
};

function GeneratedForm({ fields }: { fields: UiField[] }) {
  const [form] = Form.useForm();
  const [submitted, setSubmitted] = useState(false);

  const onFinish = () => {
    setSubmitted(true);
    message.info(ru.uiPractice.formDemoSubmit);
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      {fields.map((f) => {
        const rules = f.required ? [{ required: true, message: ru.uiPractice.fieldRequired }] : [];
        if (f.type === "checkbox") {
          return (
            <Form.Item key={f.id} name={f.id} valuePropName="checked" rules={rules}>
              <Checkbox>{f.label}</Checkbox>
            </Form.Item>
          );
        }
        if (f.type === "textarea") {
          return (
            <Form.Item key={f.id} label={f.label} name={f.id} rules={rules}>
              <Input.TextArea rows={3} placeholder={f.placeholder} />
            </Form.Item>
          );
        }
        if (f.type === "select") {
          return (
            <Form.Item key={f.id} label={f.label} name={f.id} rules={rules}>
              <Select
                placeholder={f.placeholder || ru.uiPractice.selectPlaceholder}
                options={(f.options || []).map((o) => ({ label: o, value: o }))}
              />
            </Form.Item>
          );
        }
        const inputType =
          f.type === "email" || f.type === "password" || f.type === "number" ? f.type : "text";
        return (
          <Form.Item key={f.id} label={f.label} name={f.id} rules={rules}>
            {inputType === "number" ? (
              <InputNumber style={{ width: "100%" }} placeholder={f.placeholder} />
            ) : (
              <Input type={inputType} placeholder={f.placeholder} />
            )}
          </Form.Item>
        );
      })}
      <Button type="primary" htmlType="submit">
        {ru.uiPractice.formSubmitButton}
      </Button>
      {submitted && (
        <Alert type="info" message={ru.uiPractice.formDemoDone} style={{ marginTop: 12 }} showIcon />
      )}
    </Form>
  );
}

export default function UiPracticePlayer({ step, content: contentProp, title, preview }: Props) {
  const content = (contentProp || (step?.content as UiPracticeContent)) ?? {};
  const fields = useMemo(() => {
    const raw = content.fields;
    if (!Array.isArray(raw)) return [];
    return raw.filter((f) => f && typeof f === "object" && f.id && f.label) as UiField[];
  }, [content.fields]);

  const stepTitle = title || step?.title || ru.uiPractice.defaultTitle;
  const stepId = step?.id;

  return (
    <Space direction="vertical" style={{ width: "100%" }} size="large">
      <Card title={ru.uiPractice.objectTitle}>
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          {stepTitle}
        </Typography.Title>
        {content.task_html && <RichHtmlViewer html={content.task_html} />}
        {fields.length > 0 ? (
          <GeneratedForm fields={fields} />
        ) : content.form_html ? (
          <RichHtmlViewer html={content.form_html} />
        ) : (
          <Typography.Text type="secondary">{ru.uiPractice.noForm}</Typography.Text>
        )}
        {content.ui_hints?.length ? (
          <div style={{ marginTop: 16 }}>
            <Typography.Text strong>{ru.uiPractice.hintsTitle}</Typography.Text>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
              {content.ui_hints.map((h, i) => (
                <li key={i}>
                  <Typography.Text>{h}</Typography.Text>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>

      {!preview && stepId && (
        <Card title={ru.uiPractice.testCaseTitle}>
          <TestCaseForm
            stepId={stepId}
            submit={(id, values) => stepsApi.submitUiPractice(id, values)}
          />
        </Card>
      )}
    </Space>
  );
}
