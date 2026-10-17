import React from 'react';
import { Star } from 'lucide-react';

/**
 * Component hiển thị sao đánh giá (1 - 5 sao) và hỗ trợ tương tác chọn số sao
 */
export const StarRating = ({ rating = 0, onRatingChange, interactive = false, size = 18 }) => {
  const stars = [1, 2, 3, 4, 5];

  if (!interactive) {
    return (
      <div
        className="inline-flex items-center gap-1"
        role="img"
        aria-label={`${rating} trên 5 sao`}
      >
        {stars.map((sao) => {
          const isFilled = sao <= rating;
          return (
            <span
              key={sao}
              aria-hidden="true"
              style={{
                color: isFilled ? '#D97706' : 'var(--border)',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              <Star
                size={size}
                fill={isFilled ? '#D97706' : 'transparent'}
                strokeWidth={1.5}
              />
            </span>
          );
        })}
      </div>
    );
  }

  // Nhóm radio đúng chuẩn bàn phím: Tab chỉ vào một nút (sao đang chọn), mũi tên đổi số sao
  const saoDangChon = Math.min(Math.max(rating, 1), 5);
  const handlePhim = (e) => {
    let saoMoi = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') saoMoi = Math.min(saoDangChon + 1, 5);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') saoMoi = Math.max(saoDangChon - 1, 1);
    if (saoMoi === null) return;

    e.preventDefault();
    if (onRatingChange) onRatingChange(saoMoi);
    e.currentTarget.querySelectorAll('[role="radio"]')[saoMoi - 1]?.focus();
  };

  return (
    <div
      className="inline-flex items-center gap-1"
      role="radiogroup"
      aria-label="Chọn số sao"
      onKeyDown={handlePhim}
    >
      {stars.map((sao) => {
        const isFilled = sao <= rating;
        return (
          <button
            key={sao}
            type="button"
            role="radio"
            tabIndex={sao === saoDangChon ? 0 : -1}
            aria-checked={sao === rating}
            aria-label={`${sao} sao`}
            onClick={() => onRatingChange && onRatingChange(sao)}
            style={{
              cursor: 'pointer',
              color: isFilled ? '#D97706' : 'var(--border)',
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'inline-flex',
              alignItems: 'center'
            }}
          >
            <Star
              size={size}
              fill={isFilled ? '#D97706' : 'transparent'}
              strokeWidth={1.5}
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
