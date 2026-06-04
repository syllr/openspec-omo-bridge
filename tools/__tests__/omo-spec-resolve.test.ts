#!/usr/bin/env bun test
/**
 * resolveChangeContext 纯函数单元测试
 * 测试 tool 参数 → change 上下文推导逻辑
 */

import { describe, expect, test } from "bun:test"
import { resolveChangeContext } from "../omo-spec"

const ROOT = "/Users/test/project"

describe("resolveChangeContext - 缺参数", () => {
  test("两个参数都缺 → throw", () => {
    expect(() =>
      resolveChangeContext({}, ROOT)
    ).toThrow(/至少传一个参数/)
  })

  test("两个参数都传空字符串 → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "", plan_file_path: "   " }, ROOT)
    ).toThrow(/至少传一个参数/)
  })
})

describe("resolveChangeContext - 只传 change_name", () => {
  test("从 change_name 推导 plan_path", () => {
    const r = resolveChangeContext({ change_name: "my-change" }, ROOT)
    expect(r.changeName).toBe("my-change")
    expect(r.planPath).toBe(`${ROOT}/.omo/plans/my-change.md`)
    expect(r.changeDir).toBe(`${ROOT}/openspec/changes/my-change`)
  })

  test("trim 空白后正常", () => {
    const r = resolveChangeContext({ change_name: "  foo  " }, ROOT)
    expect(r.changeName).toBe("foo")
    expect(r.planPath).toBe(`${ROOT}/.omo/plans/foo.md`)
  })
})

describe("resolveChangeContext - 只传 plan_file_path", () => {
  test("从 plan_file_path basename 推 change_name", () => {
    const r = resolveChangeContext(
      { plan_file_path: "/abs/.omo/plans/my-change.md" },
      ROOT
    )
    expect(r.changeName).toBe("my-change")
    expect(r.planPath).toBe("/abs/.omo/plans/my-change.md")
    expect(r.changeDir).toBe(`${ROOT}/openspec/changes/my-change`)
  })

  test("basename 必须去掉 .md 扩展名", () => {
    const r = resolveChangeContext(
      { plan_file_path: "/x/.omo/plans/foo.md" },
      ROOT
    )
    expect(r.changeName).toBe("foo")
  })
})

describe("resolveChangeContext - 两者都传", () => {
  test("一致时正常返回", () => {
    const r = resolveChangeContext(
      {
        change_name: "my-change",
        plan_file_path: "/abs/.omo/plans/my-change.md",
      },
      ROOT
    )
    expect(r.changeName).toBe("my-change")
    expect(r.planPath).toBe("/abs/.omo/plans/my-change.md")
  })

  test("不一致时 throw", () => {
    expect(() =>
      resolveChangeContext(
        {
          change_name: "foo",
          plan_file_path: "/abs/.omo/plans/bar.md",
        },
        ROOT
      )
    ).toThrow(/不一致/)
  })
})

describe("resolveChangeContext - typeof 守卫", () => {
  test("change_name 为 number → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: 123 as unknown as string }, ROOT)
    ).toThrow(/参数类型错误.*change_name/)
  })

  test("change_name 为 boolean → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: true as unknown as string }, ROOT)
    ).toThrow(/参数类型错误.*change_name/)
  })

  test("plan_file_path 为 null → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: null as unknown as string }, ROOT)
    ).toThrow(/参数类型错误.*plan_file_path/)
  })
})

describe("resolveChangeContext - .md 守卫", () => {
  test("plan_file_path 不以 .md 结尾（.txt）→ throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: "/foo/bar.txt" }, ROOT)
    ).toThrow(/必须以 \.md 结尾/)
  })

  test("plan_file_path 无扩展名 → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: "/foo/bar" }, ROOT)
    ).toThrow(/必须以 \.md 结尾/)
  })
})

describe("resolveChangeContext - 路径分隔符守卫", () => {
  test("change_name 含 '/' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "foo/bar" }, ROOT)
    ).toThrow(/路径分隔符/)
  })

  test("change_name 含 '\\\\' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "foo\\bar" }, ROOT)
    ).toThrow(/路径分隔符/)
  })
})

describe("resolveChangeContext - 路径遍历守卫", () => {
  test("change_name 是 '.' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "." }, ROOT)
    ).toThrow(/'\.' 或 '\.\.'/)
  })

  test("change_name 是 '..' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: ".." }, ROOT)
    ).toThrow(/'\.' 或 '\.\.'/)
  })
})

describe("resolveChangeContext - typeof 守卫", () => {
  test("change_name 为 number → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: 123 as any }, ROOT)
    ).toThrow(/参数类型错误/)
  })

  test("change_name 为 boolean → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: true as any }, ROOT)
    ).toThrow(/参数类型错误/)
  })

  test("change_name 为 array → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: [1, 2] as any }, ROOT)
    ).toThrow(/参数类型错误/)
  })

  test("plan_file_path 为 null → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: null as any }, ROOT)
    ).toThrow(/参数类型错误/)
  })

  test("plan_file_path 为 object → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: { foo: "bar" } as any }, ROOT)
    ).toThrow(/参数类型错误/)
  })
})

describe("resolveChangeContext - plan_file_path 格式守卫", () => {
  test("不以 .md 结尾 → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: "/foo/bar.txt" }, ROOT)
    ).toThrow(/必须以 \.md 结尾/)
  })

  test("无扩展名 → throw", () => {
    expect(() =>
      resolveChangeContext({ plan_file_path: "/foo/bar" }, ROOT)
    ).toThrow(/必须以 \.md 结尾/)
  })
})

describe("resolveChangeContext - change_name 路径分隔符守卫", () => {
  test("change_name 含 / → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "foo/bar" }, ROOT)
    ).toThrow(/路径分隔符/)
  })

  test("change_name 含 \\\\ → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "foo\\bar" }, ROOT)
    ).toThrow(/路径分隔符/)
  })

  test("change_name 是 '.' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: "." }, ROOT)
    ).toThrow(/'\.' 或 '\.\.'/)
  })

  test("change_name 是 '..' → throw", () => {
    expect(() =>
      resolveChangeContext({ change_name: ".." }, ROOT)
    ).toThrow(/'\.' 或 '\.\.'/)
  })
})
