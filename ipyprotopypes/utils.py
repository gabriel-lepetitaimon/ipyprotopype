import inspect


def call_matching_params(method, args=None, kwargs=None):
    """
    Call the specified method, matching the arguments it needs with those,
    provided in kwargs. The useless arguments are ignored.
    If some not optional arguments is missing, a ValueError exception is raised.
    :param method: The method to call
    :param kwargs: Parameters provided to method
    :return: Whatever is returned by method (might be None)
    """
    method_params = inspect.signature(method).parameters.keys()
    if kwargs:
        method_params = {_: kwargs[_] for _ in method_params & kwargs.keys()}

    if args is None:
        args = []
    i_args = 0
    for not_opt in not_optional_args(method):
        if not_opt not in method_params:
            if i_args < len(args):
                method_params[not_opt] = args[i_args]
                i_args += 1
            else:
                raise ValueError('%s is not optional to call method: %s.' % (not_opt, method))

    return method(**method_params)


def not_optional_args(f):
    """
    List all the parameters not optional of a method
    :param f: The method to analise
    :return: The list of parameters
    :rtype: list
    """
    sig = inspect.signature(f)
    return [p_name for p_name, p in sig.parameters.items() if p.default is inspect.Parameter.empty]


class EventsDispatcher:
    def __init__(self):
        self._cb = []

    def __call__(self, cb):
        self.subscribe(cb)

    def dispatch(self, *args, **kwargs):
        for cb in self._cb:
            call_matching_params(cb, args=args, kwargs=kwargs)

    def subscribe(self, cb):
        self._cb.append(cb)

        def unsubscribe():
            self.unsubscribe(cb)
        return unsubscribe

    def unsubscribe(self, cb):
        self._cb.remove(cb)
