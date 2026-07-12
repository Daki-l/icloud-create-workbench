import useCountDownTimer from './use-count-down-timer';
import useLoading from './use-loading';

const REG_PHONE =
  /^[1](([3][0-9])|([4][01456789])|([5][012356789])|([6][2567])|([7][0-8])|([8][0-9])|([9][012356789]))[0-9]{8}$/;

export type CaptchaCountingLabelGetter = (count: number) => string;

export type CaptchaRequest = (target: string) => Promise<void> | void;

export type CaptchaTargetValidator = (target: string) => boolean;

export interface UseCaptchaOptions {
  /** 发送验证码的实际请求逻辑 */
  request?: CaptchaRequest;

  /** 倒计时时长，按秒计算 */
  seconds?: number;

  /** 发送前校验接收验证码的目标 */
  validateTarget?: CaptchaTargetValidator;
}

function defaultRequest() {
  return new Promise<void>(resolve => {
    setTimeout(resolve, 500);
  });
}

function defaultValidateTarget(target: string) {
  return REG_PHONE.test(target.trim());
}

function getDefaultCountingLabel(count: number) {
  return `${count}秒后重新获取`;
}

export default function useCaptcha(
  defaultLabel = '获取验证码',
  getCountingLabel: CaptchaCountingLabelGetter = getDefaultCountingLabel,
  options: UseCaptchaOptions = {}
) {
  const { request = defaultRequest, seconds = 10, validateTarget = defaultValidateTarget } = options;

  const { count, isCounting, start } = useCountDownTimer(seconds);
  const { endLoading, loading, startLoading } = useLoading();

  let label = defaultLabel;

  if (loading) {
    label = '';
  }

  if (isCounting) {
    label = getCountingLabel(count);
  }

  async function getCaptcha(target: string) {
    const valid = validateTarget(target);

    if (!valid || loading) {
      return;
    }

    startLoading();

    try {
      await request(target);
      start();
    } finally {
      endLoading();
    }
  }

  return {
    count,
    getCaptcha,
    isCounting,
    label,
    loading
  };
}
