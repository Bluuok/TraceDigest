import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TopicEmptyState } from '../../src/renderer/src/features/topics/components/TopicEmptyState'
import { useTopicPackage } from '../../src/renderer/src/features/topics/hooks/useTopicPackage'
import { projectTopicPackage } from '../../src/shared/topic-package'
import type { TopicBundle } from '../../src/shared/topic-digest'

let originalApi: PropertyDescriptor | undefined
beforeEach(() => {
  originalApi = Object.getOwnPropertyDescriptor(window, 'api')
})
afterEach(() => {
  if (originalApi) Object.defineProperty(window, 'api', originalApi)
  else delete (window as Partial<Window>).api
})

describe('topic presentation cleanup compatibility', () => {
  it.each([
    ['initial', '每段讨论，都有值得留下的内容'],
    ['no_results', '未检索到内容'],
    ['no_group', '未选择群聊']
  ] as const)('preserves %s markup and retry visibility', (variant, label) => {
    const onRetry = vi.fn()
    const { container } = render(
      <TopicEmptyState variant={variant} topic="craft" onRetry={onRetry} />
    )
    const root = container.firstElementChild!
    expect(root).toHaveClass('topics-state-container')
    expect(root).toHaveAttribute('aria-label', label)
    expect(Array.from(root.children, (child) => child.tagName)).toEqual(
      variant === 'no_results' ? ['IMG', 'H3', 'P', 'BUTTON'] : ['IMG', 'H3', 'P']
    )
    const image = root.querySelector('img')!
    expect(image).toHaveClass('state-doodle')
    expect(image).toHaveAttribute('width', '80')
    expect(image).toHaveAttribute('height', '64')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('aria-hidden', 'true')
    if (variant === 'no_results') {
      expect(screen.getByRole('heading')).toHaveTextContent('未检索到与「craft」相关的讨论')
      screen.getByRole('button', { name: '重新尝试' }).click()
      expect(onRetry).toHaveBeenCalledTimes(1)
    } else {
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    }
  })

  it.each(['verified', 'unavailable', 'empty'] as const)(
    'preserves %s status for generation, history and group restore',
    async (review) => {
      for (const count of [0, 1]) {
        const bundle: TopicBundle = {
          id: 'bundle-a',
          groupName: '测试群',
          createdAt: 1,
          query: {
            groupId: 'a',
            topic: 'craft',
            aliases: [],
            excludes: [],
            memberIds: [],
            startTime: 1,
            endTime: 2,
            timezone: 'Asia/Shanghai'
          },
          evidence: count
            ? [{
                id: 'E1',
                messageId: 'message-1',
                sender: '测试成员',
                timestamp: 1,
                text: 'craft',
                type: '文本',
                reason: '关键词',
                selected: true
              }]
            : [],
          claims: [],
          scannedCount: count,
          complete: true,
          warnings: [],
          review
        }
        const generateTopicPackage = vi.fn().mockResolvedValue({
          success: true,
          bundle,
          package: projectTopicPackage(bundle),
          fromCache: false
        })
        Object.defineProperty(window, 'api', {
          configurable: true,
          writable: true,
          value: { generateTopicPackage }
        })
        const { result, rerender, unmount } = renderHook(
          ({ groupId }) => useTopicPackage(groupId),
          { initialProps: { groupId: 'a' } }
        )
        const expected = review === 'unavailable' ? 'ai_failed' : count ? 'success' : 'empty'
        expect(result.current.status).toBe('idle')
        await act(async () => {
          await result.current.generate(bundle.query)
        })
        expect(result.current.status).toBe(expected)
        expect(generateTopicPackage).toHaveBeenCalledWith({
          query: bundle.query,
          forceRefresh: false
        })
        act(() => result.current.loadBundle(bundle))
        expect(result.current.status).toBe(expected)
        expect(result.current.fromCache).toBe(true)
        rerender({ groupId: 'b' })
        expect(result.current.status).toBe('idle')
        rerender({ groupId: 'a' })
        expect(result.current.status).toBe(expected)
        expect(result.current.bundle).toEqual(bundle)
        expect(result.current.fromCache).toBe(true)
        unmount()
      }
    }
  )
})
