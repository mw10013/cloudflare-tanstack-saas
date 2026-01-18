import { runAdapterTest } from "better-auth/adapters/test";
import { env } from "cloudflare:test";
import { beforeAll, describe } from "vitest";
import { d1Adapter } from "@/lib/d1-adapter";
import { resetDb } from "../test-utils";

describe("better-auth d1Adapter", () => {
  beforeAll(async () => {
    await resetDb(async (db) => {
      await db.batch([
        db.prepare(`delete from Account`),
        db.prepare(`delete from User`),
        db.prepare(
          `insert into User (id, name, email, emailVerified) values ('seed-user', 'test-name-with-modified-field', 'test-email-with-modified-field@email.com', 1)`,
        ),
      ]);
    });
  });

  runAdapterTest({
    getAdapter: (options = {}) => {
      return Promise.resolve(d1Adapter(env.D1.withSession())(options));
    },
    disableTests: {
      CREATE_MODEL: false,
      CREATE_MODEL_SHOULD_ALWAYS_RETURN_AN_ID: false,
      FIND_MODEL: false,
      FIND_MODEL_WITHOUT_ID: false,
      FIND_MODEL_WITH_SELECT: false,
      FIND_MODEL_WITH_MODIFIED_FIELD_NAME: true,
      UPDATE_MODEL: false,
      SHOULD_FIND_MANY: false,
      SHOULD_FIND_MANY_WITH_WHERE: false,
      SHOULD_FIND_MANY_WITH_OPERATORS: false,
      SHOULD_WORK_WITH_REFERENCE_FIELDS: false,
      SHOULD_FIND_MANY_WITH_SORT_BY: false,
      SHOULD_FIND_MANY_WITH_LIMIT: false,
      SHOULD_FIND_MANY_WITH_OFFSET: false,
      SHOULD_UPDATE_WITH_MULTIPLE_WHERE: false,
      DELETE_MODEL: false,
      SHOULD_DELETE_MANY: false,
      SHOULD_NOT_THROW_ON_DELETE_RECORD_NOT_FOUND: false,
      SHOULD_NOT_THROW_ON_RECORD_NOT_FOUND: false,
      SHOULD_FIND_MANY_WITH_CONTAINS_OPERATOR: false,
      SHOULD_SEARCH_USERS_WITH_STARTS_WITH: false,
      SHOULD_SEARCH_USERS_WITH_ENDS_WITH: false,
      SHOULD_PREFER_GENERATE_ID_IF_PROVIDED: false,
    },
  });
});
