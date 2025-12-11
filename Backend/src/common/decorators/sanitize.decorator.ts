import { Transform } from 'class-transformer';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import {
  sanitizeString,
  sanitizeHTML,
  sanitizeFilePath,
  validateURL,
  sanitizeCommandArg,
} from '../utils/security.utils';

/**
 * Sanitize string input to prevent XSS
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeString(value);
    }
    return value;
  });
}

/**
 * Sanitize HTML content with allowed tags
 */
export function SanitizeHTML(allowedTags?: string[]) {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeHTML(value, allowedTags);
    }
    return value;
  });
}

/**
 * Sanitize file path to prevent directory traversal
 */
export function SanitizeFilePath() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeFilePath(value);
    }
    return value;
  });
}

/**
 * Sanitize command argument to prevent OS command injection
 */
export function SanitizeCommandArg() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      return sanitizeCommandArg(value);
    }
    return value;
  });
}

/**
 * Validate URL to prevent SSRF attacks
 */
export function IsSecureURL(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSecureURL',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return validateURL(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid and safe URL (no private IPs or localhost)`;
        },
      },
    });
  };
}

/**
 * Validate that string doesn't contain NoSQL injection operators
 */
export function NoSQLInjection(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noSQLInjection',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;
          
          const noSQLOperators = [
            '$where',
            '$ne',
            '$gt',
            '$gte',
            '$lt',
            '$lte',
            '$in',
            '$nin',
            '$regex',
            '$exists',
            '$type',
            '$expr',
            '$jsonSchema',
            '$mod',
            '$text',
          ];

          return !noSQLOperators.some((op) => value.includes(op));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially malicious operators`;
        },
      },
    });
  };
}

/**
 * Prevent SQL injection patterns
 */
export function NoSQLPattern(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noSQLPattern',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return true;

          const sqlPatterns = [
            /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript|eval)\b)/gi,
            /(--|\#|\/\*|\*\/)/g,
            /('|"|;|\||&|\$)/g,
          ];

          return !sqlPatterns.some((pattern) => pattern.test(value));
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} contains potentially malicious SQL patterns`;
        },
      },
    });
  };
}
