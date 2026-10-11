import React from 'react';
import { Star } from 'lucide-react';

/**
 * Component hiển thị sao đánh giá (1 - 5 sao) và hỗ trợ tương tác chọn số sao
 */
export const StarRating = ({ rating = 0, onRatingChange, interactive = false, size = 18 }) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className="inline-flex items-center gap-1">
      {stars.map((sao) => {
        const isFilled = sao <= rating;
        return (
          <button
            key={sao}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRatingChange && onRatingChange(sao)}
            style={{
              cursor: interactive ? 'pointer' : 'default',
              color: isFilled ? '#D97706' : 'var(--border)',
              background: 'none',
              border: 'none',
              padding: 0,
              display: 'flex',
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
