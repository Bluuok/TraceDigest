import React from 'react'
import bookPlantSvg from '../../../assets/decor/book-plant.svg'

interface TopicEmptyStateProps {
  variant: 'initial' | 'no_results' | 'no_group'
  topic?: string
  onRetry?: () => void
}

export function TopicEmptyState({
  variant,
  topic,
  onRetry
}: TopicEmptyStateProps): React.ReactElement {
  const noGroup = variant === 'no_group'
  const noResults = variant === 'no_results'
  const title = noGroup
    ? '从选择一个群聊开始'
    : noResults
      ? `未检索到与「${topic || '该话题'}」相关的讨论`
      : '每段讨论，都有值得留下的内容'
  const label = noGroup ? '未选择群聊' : noResults ? '未检索到内容' : title
  const description = noGroup
    ? '在左侧选择需要整理的微信群聊，开启话题提取与证据核对。'
    : noResults
      ? '在所选时间范围和筛选规则内未找到匹配消息。可以尝试微调关键词、放宽日期范围或在高级筛选中增添别名。'
      : '选好群聊与话题关键词后，点击「生成话题包」，在此处逐条核对摘要与原始消息。'

  return (
    <div className="topics-state-container" aria-label={label}>
      <img
        className="state-doodle"
        src={bookPlantSvg}
        width={80}
        height={64}
        alt=""
        aria-hidden="true"
      />
      <h3>{title}</h3>
      <p>{description}</p>
      {noResults && onRetry && (
        <button type="button" className="topic-retry-button" onClick={onRetry}>
          重新尝试
        </button>
      )}
    </div>
  )
}
