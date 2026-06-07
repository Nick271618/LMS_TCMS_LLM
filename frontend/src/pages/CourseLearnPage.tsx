import { Button, Card, Drawer, Input, Layout, Menu, Space, Spin, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { coursesApi, lessonsApi, type CourseStructure, type Step } from "../api/courses";
import { notesApi, type Note } from "../api/notes";
import StepPlayer from "../components/StepPlayer";

const { Sider, Content } = Layout;

export default function CourseLearnPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [search, setSearch] = useSearchParams();
  const [structure, setStructure] = useState<CourseStructure | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesQuery, setNotesQuery] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const lessonId = search.get("lesson");
  const stepId = search.get("step");

  const flatLessons = useMemo(() => {
    if (!structure) return [];
    return structure.modules.flatMap((m) =>
      m.lessons.map((l) => ({ ...l, moduleTitle: m.title })),
    );
  }, [structure]);

  const currentStep = steps.find((s) => s.id === stepId) ?? steps[0];

  const loadNotes = () => {
    if (!courseId) return;
    setNotesLoading(true);
    notesApi
      .list(courseId)
      .then((items) => setNotes(items))
      .catch((e) => message.error(e instanceof Error ? e.message : "Не удалось загрузить заметки"))
      .finally(() => setNotesLoading(false));
  };

  useEffect(() => {
    if (!courseId) return;
    coursesApi
      .structure(courseId)
      .then((s) => {
        setStructure(s);
        const first = s.modules[0]?.lessons[0];
        if (first && !lessonId) {
          setSearch({ lesson: first.id });
        }
      })
      .catch(() => message.error("Курс не найден"))
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    if (!lessonId) return;
    lessonsApi
      .steps(lessonId)
      .then((st) => {
        setSteps(st);
        if (st.length && !stepId) setSearch({ lesson: lessonId, step: st[0].id });
      })
      .catch(() => message.error("Не удалось загрузить шаги"));
  }, [lessonId]);

  useEffect(() => {
    if (notesOpen) loadNotes();
  }, [notesOpen, courseId]);

  const menuItems = flatLessons.map((l) => ({
    key: l.id,
    label: `${l.moduleTitle} → ${l.title}`,
  }));

  const filteredNotes = useMemo(() => {
    const q = notesQuery.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const hay = [
        n.selection_text,
        n.note_text,
        n.module_title,
        n.lesson_title,
        n.step_title,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [notes, notesQuery]);

  const beginEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingText(note.note_text || "");
  };

  const saveEdit = async () => {
    if (!editingNoteId) return;
    try {
      await notesApi.update(editingNoteId, { note_text: editingText });
      setEditingNoteId(null);
      setEditingText("");
      loadNotes();
      message.success("Сохранено");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const removeNote = async (noteId: string) => {
    try {
      await notesApi.remove(noteId);
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setEditingText("");
      }
      loadNotes();
      message.success("Удалено");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Не удалось удалить");
    }
  };

  const goToNote = (n: Note) => {
    setNotesOpen(false);
    setSearch({ lesson: n.lesson_id, step: n.step_id });
  };

  const saveSelectionToNotes = async (selectionText: string, step: Step) => {
    if (!courseId) return;
    const text = selectionText.trim();
    if (!text) return;
    try {
      const created = await notesApi.create({
        course: courseId,
        step: step.id,
        selection_text: text,
        note_text: "",
      });
      setNotesOpen(true);
      setNotesQuery("");
      setEditingNoteId(created.id);
      setEditingText("");
      loadNotes();
      message.success("Сохранено в заметки");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Не удалось сохранить заметку");
    }
  };

  const goNext = () => {
    const idx = steps.findIndex((s) => s.id === (stepId || currentStep?.id));
    if (idx >= 0 && idx < steps.length - 1) {
      setSearch({ lesson: lessonId!, step: steps[idx + 1].id });
    }
  };

  if (loading) return <Spin style={{ display: "block", margin: "80px auto" }} />;

  return (
    <Layout style={{ background: "#fff", minHeight: "70vh" }}>
      <Sider width={280} theme="light" style={{ borderRight: "1px solid #eee" }}>
        <div style={{ padding: 16 }}>
          <Link to="/">← Моё обучение</Link>
          <Typography.Title level={5} style={{ marginTop: 12 }}>
            {structure?.title}
          </Typography.Title>
          <Button style={{ marginTop: 12 }} onClick={() => setNotesOpen(true)} block>
            Заметки
          </Button>
        </div>
        <Menu
          mode="inline"
          selectedKeys={lessonId ? [lessonId] : []}
          items={menuItems}
          onClick={({ key }) => setSearch({ lesson: key })}
        />
      </Sider>
      <Content style={{ padding: 24 }}>
        {steps.length > 0 && currentStep ? (
          <>
            <StepPlayer
              step={currentStep}
              onSaveNoteSelection={(selectionText) => saveSelectionToNotes(selectionText, currentStep)}
            />
            <Button type="primary" style={{ marginTop: 24 }} onClick={goNext}>
              Следующий шаг →
            </Button>
          </>
        ) : (
          <Card>Выберите урок слева</Card>
        )}
      </Content>
      <Drawer
        title="Заметки"
        open={notesOpen}
        width={520}
        onClose={() => {
          setNotesOpen(false);
          setEditingNoteId(null);
          setEditingText("");
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="middle">
          <Input
            placeholder="Слово или фраза из заметки"
            value={notesQuery}
            onChange={(e) => setNotesQuery(e.target.value)}
            allowClear
          />

          {notesLoading ? (
            <Spin />
          ) : filteredNotes.length ? (
            <Space direction="vertical" style={{ width: "100%" }} size="middle">
              {filteredNotes.map((n) => {
                const isEditing = editingNoteId === n.id;
                return (
                  <Card
                    key={n.id}
                    size="small"
                    hoverable
                    onClick={() => goToNote(n)}
                    style={{ cursor: "pointer" }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size={8}>
                      <Typography.Text strong ellipsis>
                        {n.selection_text}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {(n.module_title || "—") + " → " + (n.lesson_title || "—") + " → " + (n.step_title || "—")}
                      </Typography.Text>
                      {isEditing ? (
                        <Space direction="vertical" style={{ width: "100%" }} size={8}>
                          <Input.TextArea
                            rows={3}
                            value={editingText}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setEditingText(e.target.value)}
                            placeholder="Текст заметки…"
                          />
                          <Space>
                            <Button
                              type="primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                void saveEdit();
                              }}
                            >
                              Сохранить
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingNoteId(null);
                                setEditingText("");
                              }}
                            >
                              Отмена
                            </Button>
                            <Button
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeNote(n.id);
                              }}
                            >
                              Удалить
                            </Button>
                          </Space>
                        </Space>
                      ) : (
                        <>
                          {n.note_text ? (
                            <Typography.Paragraph style={{ marginBottom: 0 }}>{n.note_text}</Typography.Paragraph>
                          ) : (
                            <Typography.Text type="secondary">Без текста</Typography.Text>
                          )}
                          <Space>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                beginEdit(n);
                              }}
                            >
                              Редактировать
                            </Button>
                            <Button
                              danger
                              onClick={(e) => {
                                e.stopPropagation();
                                void removeNote(n.id);
                              }}
                            >
                              Удалить
                            </Button>
                          </Space>
                        </>
                      )}
                    </Space>
                  </Card>
                );
              })}
            </Space>
          ) : (
            <Typography.Text type="secondary">Пока нет заметок</Typography.Text>
          )}
        </Space>
      </Drawer>
    </Layout>
  );
}
