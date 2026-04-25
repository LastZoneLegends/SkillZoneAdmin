import React from 'react';
import { getStatusColor } from '../../utils/formatters';

export default function Badge({ status, className = '' }) {
  return (
      <span className={`
            px-2.5 py-1 rounded-full text-xs font-medium capitalize
                  ${getStatusColor(status)}
                        ${className}
                            `}>
                                  {status}
                                      </span>
                                        );
                                        }
                                        