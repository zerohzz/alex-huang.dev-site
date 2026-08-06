_RESULTS = []
def case(name):
    def deco(fn):
        try:
            fn()
            _RESULTS.append({'name': name, 'ok': True, 'msg': ''})
        except AssertionError as e:
            _RESULTS.append({'name': name, 'ok': False, 'msg': str(e) or '断言不成立'})
        except Exception as e:
            _RESULTS.append({'name': name, 'ok': False, 'msg': type(e).__name__ + ': ' + str(e)})
        return fn
    return deco
def check_eq(name, thunk, want):
    @case(name)
    def _chk():
        got = thunk() if callable(thunk) else thunk
        assert got == want, '期望 ' + repr(want) + '，实际 ' + repr(got)
