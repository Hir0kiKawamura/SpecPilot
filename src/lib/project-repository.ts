import type { Project, ProjectSummary } from "@/lib/project-types";

export type ProjectRepository = {
  list: () => Promise<ProjectSummary[]>;
  get: (id: string) => Promise<Project | null>;
  put: (project: Project) => Promise<void>;
  delete: (id: string) => Promise<void>;
};

const DB_NAME = "specpilot";
const DB_VERSION = 1;
const PROJECT_STORE = "projects";

let dbPromise: Promise<IDBDatabase> | null = null;
let repository: ProjectRepository | null = null;

const openDatabase = (): Promise<IDBDatabase> => {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available"));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(PROJECT_STORE)) {
        const store = db.createObjectStore(PROJECT_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Failed to open IndexedDB"));
  });

  return dbPromise;
};

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("IndexedDB request failed"));
  });

const getObjectStore = async (
  mode: IDBTransactionMode,
): Promise<IDBObjectStore> => {
  const db = await openDatabase();
  return db.transaction(PROJECT_STORE, mode).objectStore(PROJECT_STORE);
};

class IndexedDbProjectRepository implements ProjectRepository {
  async list(): Promise<ProjectSummary[]> {
    const store = await getObjectStore("readonly");
    const projects = await requestToPromise<Project[]>(store.getAll());

    return projects
      .map(({ id, title, description, createdAt, draft, requirements, tests, versions }) => {
        const latestVersion = versions
          ?.slice()
          .sort((a, b) => b.major - a.major || b.minor - a.minor)[0];

        return {
          id,
          title,
          description,
          createdAt,
          requirementsCount: requirements.requirements.length,
          testCasesCount:
            (draft?.data || tests)?.tests.reduce(
              (count, group) => count + group.cases.length,
              0,
            ) ?? 0,
          hasDraft: Boolean(draft),
          hasSavedVersion: Boolean(versions?.length),
          currentVersionLabel: draft
            ? `draft v${draft.major}.${draft.minor}`
            : latestVersion?.label ?? "未保存",
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async get(id: string): Promise<Project | null> {
    const store = await getObjectStore("readonly");
    const project = await requestToPromise<Project | undefined>(store.get(id));
    return project ?? null;
  }

  async put(project: Project): Promise<void> {
    const store = await getObjectStore("readwrite");
    await requestToPromise<IDBValidKey>(store.put(project));
  }

  async delete(id: string): Promise<void> {
    const store = await getObjectStore("readwrite");
    await requestToPromise<undefined>(store.delete(id));
  }
}

export const getProjectRepository = (): ProjectRepository => {
  repository ??= new IndexedDbProjectRepository();
  return repository;
};
